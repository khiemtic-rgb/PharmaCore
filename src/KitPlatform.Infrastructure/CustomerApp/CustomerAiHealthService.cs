using System.Text;
using System.Text.RegularExpressions;
using KitPlatform.Packs.Pharmacy.Care;
using KitPlatform.Application.CustomerApp;
using KitPlatform.Packs.Pharmacy.Knowledge;

namespace KitPlatform.Infrastructure.CustomerApp;

/// <summary>
/// Rule-based health copilot. Uses Care + Knowledge contracts only (no SQL/repositories here).
/// Entry: <see cref="Core.Engines.AiOrchestrator"/> (BR-AI-001 validation at orchestrator).
/// </summary>
internal sealed class CustomerAiHealthService : ICustomerAiHealthService
{
    private const string Disclaimer =
        "Thông tin mang tính tham khảo, không thay thế chỉ định của bác sĩ/dược sĩ.";

    private readonly IAiCareContextProvider _careContext;
    private readonly ICareProductLookup _products;
    private readonly IDrugKnowledgeQuery _knowledge;

    public CustomerAiHealthService(
        IAiCareContextProvider careContext,
        ICareProductLookup products,
        IDrugKnowledgeQuery knowledge)
    {
        _careContext = careContext;
        _products = products;
        _knowledge = knowledge;
    }

    public async Task<AiHealthAskResponse> AskAsync(
        Guid tenantId,
        Guid customerId,
        AiHealthAskRequest request,
        CancellationToken cancellationToken = default)
    {
        var question = request.Question?.Trim() ?? "";
        var normalized = question.ToLowerInvariant();

        var context = await _careContext.GetMedicationContextAsync(tenantId, customerId, cancellationToken);

        var match = await ResolveProductAsync(
            tenantId,
            normalized,
            request.ProductId,
            context,
            cancellationToken);

        var (answer, confidence, suggestChat) = BuildAnswer(normalized, match, context);

        return new AiHealthAskResponse(answer, confidence, suggestChat, Disclaimer);
    }

    private sealed record ProductMatch(
        Guid? ProductId,
        string? ProductName,
        string? GenericName,
        AiCareReminderDto? Reminder);

    private async Task<ProductMatch> ResolveProductAsync(
        Guid tenantId,
        string normalizedQuestion,
        Guid? requestedProductId,
        AiCareMedicationContextDto context,
        CancellationToken cancellationToken)
    {
        string? productName = null;
        string? genericName = null;
        Guid? productId = requestedProductId;
        AiCareReminderDto? reminder = null;

        if (productId is Guid id)
        {
            var product = await _products.GetProductAsync(tenantId, id, cancellationToken);
            productName = product?.ProductName;
            genericName = product?.GenericName;
            reminder = context.Reminders.FirstOrDefault(r => r.ProductId == id);
        }

        if (productName is null)
        {
            reminder = context.Reminders
                .FirstOrDefault(m => NameMentioned(normalizedQuestion, m.ProductName));
            productName = reminder?.ProductName;
            productId ??= reminder?.ProductId;
        }

        if (productName is null)
        {
            var order = context.Orders
                .FirstOrDefault(o => NameMentioned(normalizedQuestion, o.ProductName));
            productName = order?.ProductName;
            productId ??= order?.ProductId;
            reminder ??= context.Reminders.FirstOrDefault(r => r.ProductId == order?.ProductId);
        }

        if (productName is null)
        {
            foreach (var candidate in context.Reminders)
            {
                var product = await _products.GetProductAsync(tenantId, candidate.ProductId, cancellationToken);
                if (product?.GenericName is not null
                    && NameMentioned(normalizedQuestion, product.GenericName))
                {
                    productName = candidate.ProductName;
                    genericName = product.GenericName;
                    productId = candidate.ProductId;
                    reminder = candidate;
                    break;
                }
            }
        }

        var refersToCurrent = Regex.IsMatch(
            normalizedQuestion,
            @"thuốc này|con này|loại này|thuốc đó|nó\b|này\b");

        var timingQuestion = Regex.IsMatch(
            normalizedQuestion,
            @"trước\s+(ăn|bữa)|sau\s+(ăn|bữa)|khi\s+đói|tác dụng|công dụng|tương tác|quên|liều");

        if (productName is null && (refersToCurrent || timingQuestion))
        {
            var distinctProducts = context.Reminders
                .Select(r => r.ProductId)
                .Concat(context.Orders.Select(o => o.ProductId))
                .Distinct()
                .ToList();

            if (distinctProducts.Count == 1)
            {
                productId = distinctProducts[0];
                reminder = context.Reminders.FirstOrDefault(r => r.ProductId == productId)
                    ?? context.Reminders.FirstOrDefault();
                var order = context.Orders.FirstOrDefault(o => o.ProductId == productId);
                productName = reminder?.ProductName ?? order?.ProductName;
            }
        }

        if (productId is Guid resolvedId && (productName is not null || genericName is not null))
        {
            if (genericName is null || productName is null)
            {
                var product = await _products.GetProductAsync(tenantId, resolvedId, cancellationToken);
                productName ??= product?.ProductName;
                genericName ??= product?.GenericName;
            }

            return new ProductMatch(resolvedId, productName, genericName, reminder);
        }

        if (productId is Guid onlyId)
        {
            var product = await _products.GetProductAsync(tenantId, onlyId, cancellationToken);
            return new ProductMatch(
                onlyId,
                product?.ProductName,
                product?.GenericName,
                context.Reminders.FirstOrDefault(r => r.ProductId == onlyId));
        }

        return new ProductMatch(null, productName, genericName, reminder);
    }

    private static bool NameMentioned(string question, string name)
    {
        var normalizedName = name.Trim().ToLowerInvariant();
        if (normalizedName.Length < 3)
            return false;

        if (question.Contains(normalizedName, StringComparison.Ordinal))
            return true;

        var token = normalizedName.Split([' ', '-', '+'], StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault(t => t.Length >= 4);
        return token is not null && question.Contains(token, StringComparison.Ordinal);
    }

    private (string Answer, string Confidence, bool SuggestChat) BuildAnswer(
        string question,
        ProductMatch match,
        AiCareMedicationContextDto context)
    {
        var drug = string.IsNullOrWhiteSpace(match.ProductName) ? "thuốc" : match.ProductName;
        var dosageHint = match.Reminder?.DosageNote?.Trim();

        if (Regex.IsMatch(question, @"đang\s+(uống|dùng)|thuốc\s+nào|lịch\s+(thuốc|uống)|danh\s+sách\s+thuốc|đơn\s+gần"))
        {
            if (context.Reminders.Count == 0 && context.Orders.Count == 0)
            {
                return (
                    "Chưa thấy lịch nhắc uống thuốc hoặc đơn gần đây trong app. " +
                    "Bạn có thể bật nhắc uống tại Thuốc của tôi hoặc mua tại nhà thuốc để đồng bộ đơn.",
                    "medium",
                    false);
            }

            return (FormatMedicationOverview(context), "high", false);
        }

        if (match.ProductName is null
            && Regex.IsMatch(question, @"thuốc này|con này|loại này|trước\s+ăn|sau\s+ăn|tác dụng|tương tác"))
        {
            var count = context.Reminders.Select(r => r.ProductId)
                .Concat(context.Orders.Select(o => o.ProductId))
                .Distinct()
                .Count();
            if (count > 1)
            {
                var names = context.Reminders.Select(r => r.ProductName)
                    .Concat(context.Orders.Select(o => o.ProductName))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Take(6);
                return (
                    "Bạn đang theo dõi nhiều thuốc — chọn một thuốc ở trên hoặc ghi rõ tên trong câu hỏi " +
                    $"(ví dụ: \"Paracetamol uống trước ăn không?\").\nĐang có: {string.Join(", ", names)}.",
                    "medium",
                    false);
            }
        }

        if (_knowledge.TryAnswer(
                question,
                match.ProductName,
                match.GenericName,
                out var drugAnswer,
                out var drugConfidence))
        {
            var withDosage = string.IsNullOrWhiteSpace(dosageHint)
                ? drugAnswer
                : $"{drugAnswer}\n\nGhi chú trên lịch nhắc của bạn: {dosageHint}.";
            return (withDosage, drugConfidence, false);
        }

        if (Regex.IsMatch(question, @"hết\s+thuốc|sắp\s+hết|còn\s+bao\s+nhiêu|đơn\s+sắp"))
        {
            if (context.Orders.Count == 0)
            {
                return (
                    "Chưa có đơn thuốc gần đây trong app để ước tính ngày hết. " +
                    "Xem mục Đơn sắp hết thuốc hoặc chat dược sĩ để được nhắc mua lại.",
                    "medium",
                    true);
            }

            var supplyLines = context.Orders
                .OrderBy(o => o.SupplyEndDate)
                .Take(5)
                .Select(o => $"• {o.ProductName}: dự kiến hết khoảng {o.SupplyEndDate:dd/MM/yyyy} (đơn {o.OrderNumber})");
            return (
                "Theo đơn gần nhất:\n" + string.Join('\n', supplyLines) +
                "\n\nLiều thực tế có thể khác — hỏi dược sĩ nếu bạn thay đổi cách dùng.",
                "medium",
                false);
        }

        if (Regex.IsMatch(question, @"trước\s+(ăn|bữa)|khi\s+đói"))
        {
            var extra = string.IsNullOrWhiteSpace(dosageHint)
                ? ""
                : $" Ghi chú trên lịch nhắc của bạn: {dosageHint}.";
            return (
                $"Với {drug}: nhiều thuốc nên uống khi đói hoặc trước bữa ăn 30–60 phút để hấp thu tốt hơn. " +
                "Tuy nhiên một số loại (ví dụ metformin thường sau ăn) cần theo đúng hướng dẫn trên đơn." +
                extra,
                string.IsNullOrWhiteSpace(dosageHint) ? "medium" : "high",
                string.IsNullOrWhiteSpace(dosageHint));
        }

        if (Regex.IsMatch(question, @"sau\s+(ăn|bữa)|sau\s+khi\s+ăn"))
        {
            var extra = string.IsNullOrWhiteSpace(dosageHint)
                ? ""
                : $" Ghi chú trên lịch nhắc của bạn: {dosageHint}.";
            return (
                $"Với {drug}: thường uống sau bữa ăn để giảm kích ứng dạ dày. " +
                "Uống với đủ nước, tránh tự ý tăng liều." +
                extra,
                string.IsNullOrWhiteSpace(dosageHint) ? "medium" : "high",
                string.IsNullOrWhiteSpace(dosageHint));
        }

        if (Regex.IsMatch(question, @"vitamin\s*c|ascorbic"))
        {
            return (
                $"Kết hợp {drug} với vitamin C đôi khi được dùng, nhưng tương tác phụ thuộc từng hoạt chất. " +
                "Nếu bạn đang dùng nhiều thuốc kê đơn, nên xác nhận với dược sĩ.",
                "low",
                true);
        }

        if (Regex.IsMatch(question, @"tác dụng|công dụng|để làm gì"))
        {
            var generic = string.IsNullOrWhiteSpace(match.GenericName) ? "" : $" (hoạt chất: {match.GenericName})";
            return (
                $"{drug}{generic} thường được kê theo chẩn đoán cụ thể của bạn. " +
                "Đọc kỹ tờ hướng dẫn đi kèm hoặc hỏi dược sĩ để biết công dụng chính xác với liều đang dùng.",
                match.GenericName is not null ? "medium" : "low",
                match.GenericName is null);
        }

        if (Regex.IsMatch(question, @"tác dụng phụ|phản ứng|dị ứng|chóng mặt|buồn nôn"))
        {
            return (
                $"Nếu có triệu chứng bất thường khi dùng {drug} (phát ban, khó thở, choáng), ngừng thuốc và đến cơ sở y tế ngay. " +
                "Triệu chứng nhẹ có thể cần điều chỉnh liều — hãy trao đổi với dược sĩ.",
                "medium",
                true);
        }

        if (Regex.IsMatch(question, @"uống cùng|kết hợp|tương tác"))
        {
            if (context.Reminders.Count > 1 || context.Orders.Count > 1)
            {
                var names = context.Reminders.Select(r => r.ProductName)
                    .Concat(context.Orders.Select(o => o.ProductName))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Take(6);
                return (
                    "Bạn đang theo dõi nhiều thuốc: " + string.Join(", ", names) + ". " +
                    "Tương tác phụ thuộc hoạt chất — chat dược sĩ để kiểm tra an toàn với danh sách đầy đủ.",
                    "medium",
                    true);
            }

            return (
                "Tương tác thuốc phụ thuộc hoạt chất cụ thể. Gửi danh sách thuốc/vitamin bạn đang dùng để dược sĩ kiểm tra an toàn.",
                "low",
                true);
        }

        if (Regex.IsMatch(question, @"quên|bỏ liều|quên uống"))
        {
            var timeHint = match.Reminder is not null
                ? $" Lịch nhắc {match.Reminder.ProductName} của bạn: {match.Reminder.RemindTime:HH\\:mm}."
                : "";
            return (
                "Nếu quên một liều: uống bù khi nhớ ra trừ khi gần giờ liều tiếp theo (thường bỏ liều đã quên). " +
                "Không uống gấp đôi liều. Chi tiết xem hướng dẫn hoặc hỏi dược sĩ." +
                timeHint,
                match.Reminder is not null ? "high" : "medium",
                false);
        }

        if (context.Reminders.Count > 0 || context.Orders.Count > 0)
        {
            return (
                "Mình chưa có câu trả lời chuyên sâu cho câu hỏi này (trợ lý đang dùng quy tắc, chưa phải AI ngôn ngữ lớn). " +
                "Theo hồ sơ app bạn đang theo dõi:\n" +
                FormatMedicationOverview(context) +
                "\n\nHỏi cụ thể về cách uống/tác dụng một thuốc, hoặc chat dược sĩ để được tư vấn chi tiết.",
                "low",
                true);
        }

        return (
            "Mình là trợ lý tham khảo nhanh (rule-based), chưa phải chatbot AI đầy đủ. " +
            "Với câu hỏi phức tạp, hãy chat với dược sĩ nhà thuốc — họ xem được đơn và lịch sử mua của bạn.",
            "low",
            true);
    }

    private static string FormatMedicationOverview(AiCareMedicationContextDto context)
    {
        var lines = new List<string>();

        foreach (var reminder in context.Reminders)
        {
            var line = new StringBuilder($"• {reminder.ProductName} — nhắc {reminder.RemindTime:HH\\:mm}");
            if (!string.IsNullOrWhiteSpace(reminder.DosageNote))
                line.Append($" ({reminder.DosageNote.Trim()})");
            lines.Add(line.ToString());
        }

        var reminderProductIds = context.Reminders
            .Select(r => r.ProductId)
            .ToHashSet();

        foreach (var order in context.Orders.Where(o => !reminderProductIds.Contains(o.ProductId)))
        {
            lines.Add(
                $"• {order.ProductName} — đơn {order.OrderNumber} ({order.OrderDate:dd/MM/yyyy}), " +
                $"dự kiến hết ~{order.SupplyEndDate:dd/MM/yyyy}");
        }

        return lines.Count == 0
            ? "Chưa có thuốc đang theo dõi."
            : string.Join('\n', lines.Take(8));
    }
}
