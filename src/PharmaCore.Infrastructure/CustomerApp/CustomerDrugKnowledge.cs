using System.Text.RegularExpressions;

namespace PharmaCore.Infrastructure.CustomerApp;

internal static class CustomerDrugKnowledge
{
    private sealed record DrugProfile(
        string DisplayName,
        string BeforeMealHint,
        string AfterMealHint,
        string PurposeHint,
        string SideEffectHint,
        string InteractionHint);

    private static readonly (string Pattern, DrugProfile Profile)[] Profiles =
    [
        ("paracetamol|acetaminophen", new DrugProfile(
            "Paracetamol",
            "Paracetamol thường uống trước hoặc sau ăn đều được; uống đủ nước. Quan trọng là không vượt liều tối đa/ngày (thường ≤4g/người lớn).",
            "Có thể uống sau ăn nếu dạ dày nhạy cảm. Tránh uống gấp đôi liều khi quên.",
            "Hạ sốt, giảm đau nhẹ đến vừa (đau đầu, đau cơ, sốt).",
            "Hiếm gặp phản ứng dị ứng; liều cao kéo dài có thể ảnh hưởng gan.",
            "Cẩn trọng khi dùng chung nhiều thuốc cũng chứa paracetamol (tránh quá liều).")),
        ("amoxicillin", new DrugProfile(
            "Amoxicillin",
            "Kháng sinh nhóm penicillin: uống trước ăn 1 giờ hoặc sau ăn 2 giờ để hấp thu ổn định; nhiều người uống sau ăn cho dễ chịu.",
            "Uống sau ăn giúp giảm buồn nôn — phổ biến với kháng sinh.",
            "Kháng sinh điều trị nhiễm khuẩn do vi khuẩn nhạy cảm (theo chỉ định bác sĩ).",
            "Có thể gây tiêu chảy, buồn nôn; phát ban cần báo bác sĩ ngay (dị ứng penicillin).",
            "Không tự ý kết hợp với thuốc khác; hoàn tất liều trình trừ khi bác sĩ dừng.")),
        ("ibuprofen", new DrugProfile(
            "Ibuprofen",
            "NSAID: nên uống sau ăn hoặc với sữa để giảm kích ứng dạ dày; tránh uống khi đói.",
            "Ưu tiên sau bữa ăn, uống nhiều nước.",
            "Giảm đau, hạ sốt, chống viêm.",
            "Có thể gây ợ nóng, đau bụng; dùng lâu ngày cần theo dõi dạ dày/thận.",
            "Tránh dùng chung NSAID khác; cẩn trọng với thuốc chống đông/chống kết tập tiểu cầu.")),
        ("metformin", new DrugProfile(
            "Metformin",
            "Thường uống trong hoặc ngay sau bữa ăn để giảm tác dụng phụ tiêu hóa.",
            "Uống sau ăn là phổ biến nhất với metformin.",
            "Hỗ trợ kiểm soát đường huyết ở đái tháo đường type 2.",
            "Buồn nôn, tiêu chảy nhẹ lúc đầu; hiếm acid lactic nếu dùng đúng chỉ định.",
            "Báo bác sĩ nếu phải chụp có thuốc cản quang (cần ngưng tạm thời theo hướng dẫn).")),
        ("omeprazole|esomeprazole|pantoprazole", new DrugProfile(
            "Thuốc ức chế bơm proton",
            "Uống trước bữa sáng 30–60 phút khi đói để hiệu quả tốt nhất.",
            "Không khuyến cáo uống sau ăn cho PPI — ưu tiên trước ăn sáng.",
            "Giảm acid dạ dày (viêm loét, trào ngược).",
            "Đau đầu, đầy bụng nhẹ; dùng lâu ngày cần theo dõi theo bác sĩ.",
            "Có thể ảnh hưởng hấp thu một số vitamin/khoáng chất khi dùng lâu.")),
        ("ascorbic|vitamin\\s*c", new DrugProfile(
            "Vitamin C",
            "Uống sau ăn nếu dạ dày nhạy; có thể uống trước hoặc sau ăn tùy độ chịu đựng.",
            "Uống sau ăn giúp giảm kích ứng dạ dày với liều cao.",
            "Bổ sung vitamin C, hỗ trợ miễn dịch (khi thiếu hụt hoặc theo chỉ định).",
            "Liều cao có thể gây tiêu chảy, đầy hơi.",
            "Liều rất cao có thể ảnh hưởng hấp thu sắt hoặc tương tác với một số thuốc — hỏi dược sĩ nếu đang kê đơn.")),
        ("cetirizine|loratadine|fexofenadine", new DrugProfile(
            "Kháng histamin",
            "Có thể uống không phụ thuộc bữa ăn; uống buổi tối nếu gây buồn ngủ.",
            "Uống sau ăn nếu dạ dày nhạy.",
            "Giảm triệu chứng dị ứng (hắt hơi, ngứa, chảy nước mũi).",
            "Buồn ngủ (tùy loại), khô miệng.",
            "Tránh rượu bia nếu thuốc gây buồn ngủ.")),
        ("atorvastatin|rosuvastatin|simvastatin", new DrugProfile(
            "Statin",
            "Nhiều người uống buổi tối (simvastatin) hoặc bất kỳ giờ cố định nào (atorvastatin) — theo đơn.",
            "Có thể uống với hoặc không thức ăn tùy loại statin.",
            "Hỗ trợ kiểm soát cholesterol/mỡ máu.",
            "Đau cơ nhẹ; báo ngay nếu đau cơ bất thường hoặc nước tiểu sẫm.",
            "Tránh uống nhiều nước bưởi với một số statin; kiểm tra tương tác khi thêm thuốc mới.")),
    ];

    public static bool TryAnswer(
        string question,
        string? productName,
        string? genericName,
        out string answer,
        out string confidence)
    {
        answer = "";
        confidence = "medium";
        var haystack = $"{productName} {genericName}".ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(haystack.Trim()))
        {
            return false;
        }

        DrugProfile? profile = null;
        foreach (var (pattern, candidate) in Profiles)
        {
            if (Regex.IsMatch(haystack, pattern, RegexOptions.IgnoreCase))
            {
                profile = candidate;
                break;
            }
        }

        if (profile is null)
        {
            return false;
        }

        var drug = string.IsNullOrWhiteSpace(productName) ? profile.DisplayName : productName!;

        if (Regex.IsMatch(question, @"trước\s+(ăn|bữa)|khi\s+đói"))
        {
            answer = $"Với {drug}: {profile.BeforeMealHint}";
            confidence = "high";
            return true;
        }

        if (Regex.IsMatch(question, @"sau\s+(ăn|bữa)|sau\s+khi\s+ăn"))
        {
            answer = $"Với {drug}: {profile.AfterMealHint}";
            confidence = "high";
            return true;
        }

        if (Regex.IsMatch(question, @"tác dụng|công dụng|để làm gì|dùng\s+để"))
        {
            answer = $"{drug} — {profile.PurposeHint}";
            confidence = "high";
            return true;
        }

        if (Regex.IsMatch(question, @"tác dụng phụ|phản ứng|dị ứng|chóng mặt|buồn nôn|nổi mẩn"))
        {
            answer = $"Với {drug}: {profile.SideEffectHint} Triệu chứng nặng hoặc khó thở — ngừng thuốc và đến cơ sở y tế.";
            confidence = "high";
            return true;
        }

        if (Regex.IsMatch(question, @"uống cùng|kết hợp|tương tác|vitamin"))
        {
            answer = $"Với {drug}: {profile.InteractionHint}";
            confidence = "medium";
            return true;
        }

        return false;
    }
}
