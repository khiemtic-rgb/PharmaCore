using KitPlatform.Packs.Survey;



namespace KitPlatform.Packs.Survey.Infrastructure;



/// <summary>Lợi ích triển khai theo quy mô nhà thuốc — dùng khi AI không chạy hoặc lỗi.</summary>

internal static class KapScaleBasedRoiBuilder

{

    private sealed record ScaleProfile(

        string Label,

        decimal InventorySaveMin,

        decimal InventorySaveMax,

        decimal RevenueLiftMin,

        decimal RevenueLiftMax,

        string ManagementTimeSaved,

        decimal MonthlyOpportunityCostPct);



    private static ScaleProfile Profile(string? orgScale) => orgScale?.Trim().ToLowerInvariant() switch

    {

        "micro" => new ScaleProfile(

            "Quầy thuốc cá nhân", 10, 18, 12, 20, "1–1,5 giờ/ngày", 4),

        "small" => new ScaleProfile(

            "Nhà thuốc nhỏ", 15, 22, 15, 22, "1,5–2 giờ/ngày", 5),

        "medium" => new ScaleProfile(

            "Nhà thuốc vừa", 18, 28, 18, 28, "2–3 giờ/ngày", 6),

        "large" => new ScaleProfile(

            "Nhà thuốc lớn", 20, 30, 20, 32, "3–4 giờ/ngày", 7),

        "chain" => new ScaleProfile(

            "Chuỗi nhà thuốc", 22, 35, 22, 35, "4–6 giờ/ngày", 8),

        _ => new ScaleProfile(

            "Nhà thuốc", 15, 25, 15, 25, "2 giờ/ngày", 5),

    };



    public static IReadOnlyList<KapRoiMetricDto> BuildMetrics(

        string? orgScale,

        KapReportScoresDto scores,

        KapMaturityAssessmentDto? maturity)

    {

        var p = Profile(orgScale);

        var maturityFactor = maturity?.Level <= 2 ? 1.1m : 1m;

        var weak = scores.Categories.OrderBy(c => c.Score).FirstOrDefault();



        return

        [

            new("Giảm thất thoát tồn kho",

                $"{p.InventorySaveMin * maturityFactor:F0}–{p.InventorySaveMax * maturityFactor:F0}%",

                $"Quy mô {p.Label}: kiểm soát nhập — xuất — tồn theo thời gian thực, giảm lệch kho"),

            new("Tăng doanh thu khách quay lại",

                $"{p.RevenueLiftMin * maturityFactor:F0}–{p.RevenueLiftMax * maturityFactor:F0}%",

                $"Phù hợp {p.Label} — quản trị khách hàng và nhắc tái mua mang lại hiệu quả rõ"),

            new("Tiết kiệm thời gian quản lý", p.ManagementTimeSaved,

                "Giảm đối chiếu Excel và báo cáo thủ công"),

            new("Giảm hàng cận hạn / hết hạn", "55–65%",

                "FEFO tự động và cảnh báo hạn sử dụng 90/60/30 ngày"),

            new("Chuẩn hóa quy trình vận hành",

                $"Điểm {scores.OverallPct:F0}% → {Math.Min(95, scores.OverallPct + 18):F0}%",

                $"Tập trung cải thiện nhóm yếu {weak?.Name ?? "vận hành"} ({weak?.ScorePct:F0}%)"),

        ];

    }



    public static IReadOnlyList<KapBusinessImpactForecastDto> BuildForecast(

        string? orgScale,

        KapReportScoresDto scores,

        KapMaturityAssessmentDto? maturity)

    {

        var p = Profile(orgScale);

        var boost = maturity?.Level <= 2 ? 1.12m : 1m;

        var targetPct = Math.Min(95, scores.OverallPct + (p.Label.Contains("Chuỗi") ? 15 : 18));



        return

        [

            new("Doanh thu", $"+{p.RevenueLiftMin * boost:F0}–{p.RevenueLiftMax * boost:F0}%", "up"),

            new("Tồn kho chậm", $"-{p.InventorySaveMin * boost:F0}%", "down"),

            new("Thời gian quản lý", $"-{Math.Round(40 * boost):F0}%", "down"),

            new("Khách quay lại", $"+{p.RevenueLiftMin * boost:F0}%", "up"),

            new("Điểm trưởng thành", $"{scores.OverallPct:F0}% → {targetPct:F0}%", "up"),

        ];

    }



    public static KapRoiStoryDto BuildStory(

        string orgName,

        string? orgScale,

        KapReportScoresDto scores,

        KapMaturityAssessmentDto? maturity,

        IReadOnlyList<AssessmentCategoryScoreDto> weakCategories,

        IReadOnlyList<KapSoftwareModuleFitDto> modules)

    {

        var p = Profile(orgScale);

        var weak = weakCategories.FirstOrDefault();

        var targetPct = Math.Min(95, scores.OverallPct + 18);



        var before = new List<string>

        {

            $"{p.Label}: vận hành ở mức «{maturity?.Name ?? "chưa chuẩn hóa"}» — quy trình phụ thuộc kinh nghiệm cá nhân.",

            $"Điểm yếu nhất: {weak?.Name ?? "vận hành"} ({weak?.ScorePct:F0}%).",

            "Chủ nhà thuốc phụ thuộc có mặt tại quầy để nắm tình hình.",

            "Quyết định nhập hàng và kiểm soát tồn dựa trên cảm quan hơn dữ liệu.",

        };



        var after = new List<string>

        {

            $"Sau 30 ngày: {modules.FirstOrDefault()?.Outcome30Days ?? "dữ liệu bán hàng và tồn theo thời gian thực"}.",

            $"Sau 90 ngày: {modules.FirstOrDefault()?.Outcome90Days ?? $"giảm tồn {p.InventorySaveMin:F0}–{p.InventorySaveMax:F0}%, tăng khách quay lại {p.RevenueLiftMin:F0}–{p.RevenueLiftMax:F0}%"}",

            $"Tiết kiệm {p.ManagementTimeSaved} cho quản lý — phù hợp quy mô {p.Label}.",

            $"Điểm trưởng thành tăng từ {scores.OverallPct:F0}% lên ~{targetPct:F0}% trong 2 quý nếu triển khai đúng giai đoạn.",

        };



        var summary = $"{orgName} ({p.Label}) có thể cải thiện vận hành rõ rệt khi triển khai Novixa theo giai đoạn — "

            + $"giảm thất thoát tồn {p.InventorySaveMin:F0}–{p.InventorySaveMax:F0}%, tăng doanh thu lặp {p.RevenueLiftMin:F0}–{p.RevenueLiftMax:F0}% "

            + $"và tiết kiệm {p.ManagementTimeSaved} cho quản lý.";



        return new KapRoiStoryDto(summary, before, after);

    }



    public static KapCostBenefitAnalysisDto BuildCostBenefit(

        string orgName,

        string? orgScale,

        KapReportScoresDto scores,

        KapConsultingBriefDto brief,

        IReadOnlyList<KapRoiMetricDto> roiMetrics)

    {

        var p = Profile(orgScale);

        var roiRange = roiMetrics.FirstOrDefault()?.Range ?? $"{p.InventorySaveMin:F0}–{p.InventorySaveMax:F0}%";

        var targetPct = Math.Min(95, scores.OverallPct + 18);



        var items = new List<KapCostBenefitItemDto>

        {

            new("POS & kho tập trung", "Giai đoạn 1 — Novixa Core", "Dữ liệu bán hàng và tồn theo thời gian thực", "Sau 30 ngày"),

            new("Giảm thất thoát tồn kho", "Kho thông minh, cảnh báo tồn", roiRange, "Tháng 2–3"),

            new("Tiết kiệm thời gian quản lý", "Đào tạo 2–3 buổi", p.ManagementTimeSaved, "Ngay tháng 1"),

            new("Tăng khách quay lại", "CRM giai đoạn 2", $"+{p.RevenueLiftMin:F0}–{p.RevenueLiftMax:F0}% doanh thu lặp", "Tháng 3–6"),

            new("Giảm hàng cận hạn", "Tích hợp kho thông minh", "-60% hàng cận date", "Tháng 2–4"),

        };

        if (brief.ModuleFits.Any(m => m.ModuleName.Contains("bác sĩ", StringComparison.OrdinalIgnoreCase)))
        {
            items.Insert(Math.Min(4, items.Count), new(
                "Mạng bác sĩ & khám online",
                "Portal BS + đơn điện tử",
                "Tư vấn online → đơn về quầy, tăng doanh thu dịch vụ",
                "Tháng 3–6"));
        }



        var net = $"{orgName} ({p.Label}): Triển khai theo giai đoạn giúp chuẩn hóa vận hành, giảm phụ thuộc chủ có mặt tại quầy "

            + $"và nâng điểm trưởng thành từ {scores.OverallPct:F0}% lên ~{targetPct:F0}% trong 2 quý.";



        return new KapCostBenefitAnalysisDto(brief.RoiStory.Summary, items, net);

    }



    public static KapConsultingBriefDto ApplyScaleRoi(

        KapConsultingBriefDto brief,

        string orgName,

        string? orgScale,

        KapReportScoresDto scores,

        KapMaturityAssessmentDto? maturity,

        IReadOnlyList<AssessmentCategoryScoreDto> weakCategories,

        IReadOnlyList<KapSoftwareModuleFitDto> modules) =>

        brief with

        {

            RoiStory = BuildStory(orgName, orgScale, scores, maturity, weakCategories, modules),

        };

}


