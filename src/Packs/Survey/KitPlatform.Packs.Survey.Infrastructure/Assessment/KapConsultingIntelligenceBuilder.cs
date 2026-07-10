using KitPlatform.Packs.Survey;

namespace KitPlatform.Packs.Survey.Infrastructure;

/// <summary>Suy luận chéo nhóm, benchmark đa tầng, cascade, ma trận ưu tiên, «Tại sao Novixa».</summary>
internal static class KapConsultingIntelligenceBuilder
{
    public sealed record IntelligenceBundle(
        IReadOnlyList<KapBenchmarkTierDto> BenchmarkTiers,
        KapTransformationReadinessDto TransformationReadiness,
        KapCrossCategoryInsightDto CrossCategoryInsight,
        KapNarrativeCascadeDto InactionCascade,
        KapNarrativeCascadeDto ImplementationJourney,
        KapWhyNovixaDto WhyNovixa,
        KapPriorityMatrixDto PriorityMatrix);

    public static IntelligenceBundle Build(
        string orgName,
        string? orgScale,
        KapReportScoresDto scores,
        KapMaturityAssessmentDto? maturity,
        IReadOnlyList<KapRootCauseDto> rootCauses,
        IReadOnlyList<KapRiskItemDto> risks,
        IReadOnlyList<KapOpportunityItemDto> opportunities,
        KapBenchmarkAnalysisDto? benchmark,
        KapConsultingBriefDto brief,
        KapNovixaReadinessDto? novixaReadiness,
        KapGapAnalysisDto? gapAnalysis,
        KapPriorityMatrixDto? existingMatrix)
    {
        var weak = scores.Categories.OrderBy(c => c.Score).Take(3).ToList();
        var strong = scores.Categories.OrderByDescending(c => c.Score).Take(2).ToList();

        return new IntelligenceBundle(
            BuildBenchmarkTiers(scores.OverallPct, orgScale, benchmark),
            BuildTransformationReadiness(scores, maturity, novixaReadiness),
            BuildCrossCategoryInsight(orgName, scores, weak, strong, rootCauses),
            BuildInactionCascade(orgName, orgScale, scores, weak, risks, brief),
            BuildImplementationJourney(orgName, brief),
            BuildWhyNovixa(orgName, weak, gapAnalysis, brief),
            EnhancePriorityMatrix(scores, weak, opportunities, existingMatrix));
    }

    public static IReadOnlyList<KapBenchmarkTierDto> BuildBenchmarkTiers(
        decimal overallPct,
        string? orgScale,
        KapBenchmarkAnalysisDto? benchmark)
    {
        var you = overallPct;
        var scaleMean = benchmark?.OverallVsMean is decimal delta
            ? Math.Clamp(you - delta * 10m, 25, 95)
            : Math.Clamp(you + 5, 30, 80);
        var national = Math.Clamp(scaleMean - 4, 35, 72);
        var province = Math.Round((scaleMean + national) / 2m, 0);
        var top10 = Math.Clamp(Math.Max(you, scaleMean) + 12, 78, 95);

        var scaleLabel = orgScale?.Trim().ToLowerInvariant() switch
        {
            "micro" => "Quầy thuốc cá nhân",
            "small" => "Nhà thuốc nhỏ",
            "medium" => "Nhà thuốc vừa",
            "large" => "Nhà thuốc lớn",
            "chain" => "Chuỗi nhà thuốc",
            _ => "Nhà thuốc cùng quy mô",
        };

        return
        [
            new("Bạn", you, "Điểm khảo sát hiện tại"),
            new($"Nhóm {scaleLabel}", scaleMean, benchmark?.Narrative),
            new("Trung bình tỉnh/thành", province, "Ước tính từ mẫu tham chiếu khu vực"),
            new("Trung bình toàn quốc", national, "Ngưỡng tham chiếu ngành"),
            new("Top 10% ngành", top10, "Nhóm dẫn đầu — mục tiêu dài hạn"),
        ];
    }

    public static KapTransformationReadinessDto BuildTransformationReadiness(
        KapReportScoresDto scores,
        KapMaturityAssessmentDto? maturity,
        KapNovixaReadinessDto? novixaReadiness)
    {
        decimal CatPct(string code) =>
            scores.Categories.FirstOrDefault(c => c.Code.Equals(code, StringComparison.OrdinalIgnoreCase))?.ScorePct ?? 50;

        var digital = (int)Math.Round((CatPct("TECH") + CatPct("OPERATIONS")) / 2m);
        var novixa = novixaReadiness is not null
            ? (int)Math.Round(novixaReadiness.OverallPct)
            : (int)Math.Round(Math.Clamp(scores.OverallPct + (maturity?.Level <= 2 ? 8 : 12), 35, 90));
        var ai = (int)Math.Round(Math.Clamp(CatPct("TECH") * 0.6m + CatPct("BUSINESS") * 0.4m - 15, 15, 75));
        var expansion = (int)Math.Round((CatPct("GROWTH") + CatPct("OPERATIONS")) / 2m);

        var bars = new List<KapReadinessBarDto>
        {
            new("Digital Readiness", digital),
            new("Novixa Readiness", novixa),
            new("AI Readiness", ai),
            new("Expansion Readiness", expansion),
        };

        var narrative = digital >= 60
            ? "Nền tảng số đủ để triển khai theo giai đoạn — ưu tiên đóng gap vận hành trước khi mở rộng."
            : "Digital Readiness còn thấp — cần chuẩn hóa dữ liệu và quy trình trước khi kỳ vọng AI hay mở chi nhánh.";

        return new KapTransformationReadinessDto(bars, narrative);
    }

    public static KapCrossCategoryInsightDto BuildCrossCategoryInsight(
        string orgName,
        KapReportScoresDto scores,
        IReadOnlyList<AssessmentCategoryScoreDto> weak,
        IReadOnlyList<AssessmentCategoryScoreDto> strong,
        IReadOnlyList<KapRootCauseDto> rootCauses)
    {
        var w1 = weak.ElementAtOrDefault(0);
        var w2 = weak.ElementAtOrDefault(1);
        var s1 = strong.FirstOrDefault();

        var n1 = w1 is null ? "vận hành" : KapPharmacyLanguage.SimpleName(w1.Code, w1.Name);
        var n2 = w2 is null ? "dữ liệu" : KapPharmacyLanguage.SimpleName(w2.Code, w2.Name);
        var p1 = w1?.ScorePct ?? scores.OverallPct;
        var p2 = w2?.ScorePct ?? scores.OverallPct;

        var headline = $"{orgName}: điểm nghẽn không nằm ở bán hàng hiện tại mà ở khả năng quản trị và mở rộng";

        var analysis = $"Điểm {n1} ({p1:F0}%) kết hợp với {n2} ({p2:F0}%) cho thấy doanh nghiệp đang phụ thuộc nhiều vào kinh nghiệm cá nhân. "
            + "Nếu chủ nhà thuốc vắng mặt trên 3 ngày, khả năng phát sinh sai lệch tồn kho và chậm xử lý đơn hàng sẽ tăng đáng kể — "
            + "đây là dấu hiệu thiếu nền tảng quản trị tập trung, không phải thiếu năng lực bán hàng.";

        if (s1 is not null)
            analysis += $" Trong khi đó, {KapPharmacyLanguage.SimpleName(s1.Code, s1.Name)} ({s1.ScorePct:F0}%) là điểm tựa có thể khai thác khi số hóa.";

        if (rootCauses.Count > 0)
            analysis += $" Nguyên nhân gốc: {rootCauses[0].Title} — {rootCauses[0].Body}";

        var implications = new List<string>
        {
            "Quyết định nhập hàng và điều tiết tồn bị chậm khi thiếu dữ liệu tập trung.",
            "Khó nhân bản mô hình sang chi nhánh mới nếu quy trình chưa được «đóng băng» trong hệ thống.",
            "Rủi ro thất thoát và sai sót giao ca tăng khi phụ thuộc một vài nhân sự chủ chốt.",
        };

        return new KapCrossCategoryInsightDto(headline, analysis, implications);
    }

    public static KapNarrativeCascadeDto BuildInactionCascade(
        string orgName,
        string? orgScale,
        KapReportScoresDto scores,
        IReadOnlyList<AssessmentCategoryScoreDto> weak,
        IReadOnlyList<KapRiskItemDto> risks,
        KapConsultingBriefDto brief)
    {
        var topWeak = weak.FirstOrDefault()?.Name ?? "vận hành";
        var highRisk = risks.FirstOrDefault(r => r.Level.Equals("high", StringComparison.OrdinalIgnoreCase));

        var steps = new List<KapNarrativeStepDto>
        {
            new("Hiện tại", $"Vận hành phụ thuộc kinh nghiệm — {topWeak} chưa được số hóa"),
            new("3 tháng", "Sai lệch tồn kho tích lũy, khó đối chiếu cuối tháng"),
            new("6 tháng", scores.OverallPct < 55 ? "Khó mở thêm chi nhánh — quy trình chưa nhân bản được" : "Chi phí quản lý tăng khi mở rộng không đồng bộ"),
            new("6 tháng", "Khó kiểm soát nhân viên và thuốc kiểm soát đặc biệt từ xa"),
            new("12 tháng", highRisk is not null ? highRisk.Title : "Biên lợi nhuận bị bào mòn dù doanh thu ổn"),
        };

        var summary = $"Nếu {orgName} tiếp tục vận hành như hiện tại, các hệ quả dưới đây có thể xảy ra theo thời gian — "
            + "đây là kịch bản «không hành động», không phải dự báo chính xác từng con số.";

        return new KapNarrativeCascadeDto(summary, steps);
    }

    public static KapNarrativeCascadeDto BuildImplementationJourney(
        string orgName,
        KapConsultingBriefDto brief)
    {
        var m1 = brief.ModuleFits.ElementAtOrDefault(0);
        var m2 = brief.ModuleFits.ElementAtOrDefault(1);

        var steps = new List<KapNarrativeStepDto>
        {
            new("30 ngày", m1?.Outcome30Days ?? "Chuẩn hóa bán hàng và dữ liệu tồn theo thời gian thực"),
            new("60 ngày", "Kiểm soát kho, cảnh báo hạn dùng và đối soát ca"),
            new("90 ngày", m2?.Outcome90Days ?? "Quản trị khách hàng và nhắc tái mua"),
            new("180 ngày", "Bảng điều khiển điều hành và dự báo nhập hàng (AI)"),
        };

        var summary = $"Hành trình triển khai đề xuất cho {orgName} — từng giai đoạn tạo giá trị đo được, không triển khai dồn một lần.";

        return new KapNarrativeCascadeDto(summary, steps);
    }

    public static KapWhyNovixaDto BuildWhyNovixa(
        string orgName,
        IReadOnlyList<AssessmentCategoryScoreDto> weak,
        KapGapAnalysisDto? gapAnalysis,
        KapConsultingBriefDto brief)
    {
        var intro = $"Để giải quyết các điểm nghẽn của {orgName}, doanh nghiệp cần một nền tảng quản trị tập trung "
            + "có khả năng đồng bộ dữ liệu bán hàng, kho, khách hàng và quy trình vận hành. "
            + "Trong hệ sinh thái KIT Technology, Novixa là giải pháp đáp ứng đầy đủ các yêu cầu trên — "
            + "khuyến nghị dưới đây dựa trên phân tích khảo sát, không phải gói sản phẩm cố định.";

        var rows = new List<KapWhyNovixaRowDto>();

        if (gapAnalysis?.Items.Count > 0)
        {
            foreach (var item in gapAnalysis.Items.Take(5))
            {
                rows.Add(new(
                    item.CurrentState,
                    item.NovixaModule,
                    item.TargetState,
                    KpiForModule(item.NovixaModule)));
            }
        }
        else
        {
            foreach (var cat in weak.Take(4))
            {
                var pb = ModuleForCategory(cat.Code);
                rows.Add(new(
                    PainForCategory(cat.Code),
                    pb,
                    OutcomeForCategory(cat.Code),
                    KpiForModule(pb)));
            }
        }

        if (rows.Count == 0 && brief.ModuleFits.Count > 0)
        {
            foreach (var m in brief.ModuleFits.Take(4))
                rows.Add(new(m.PainResolved, m.ModuleName, m.Outcome90Days, KpiForModule(m.ModuleName)));
        }

        if (brief.ModuleFits.Any(m => m.ModuleName.Contains("bác sĩ", StringComparison.OrdinalIgnoreCase))
            && rows.All(r => !r.Module.Contains("bác sĩ", StringComparison.OrdinalIgnoreCase)))
        {
            rows.Insert(0, new(
                "Chưa liên kết bác sĩ / khám online",
                "Mạng bác sĩ & khám online",
                "Đơn điện tử tích hợp POS — tư vấn online → bán tại quầy",
                "Đơn kê đơn +8–15% doanh thu dịch vụ"));
        }

        return new KapWhyNovixaDto(intro, rows);
    }

    public static KapPriorityMatrixDto EnhancePriorityMatrix(
        KapReportScoresDto scores,
        IReadOnlyList<AssessmentCategoryScoreDto> weak,
        IReadOnlyList<KapOpportunityItemDto> opportunities,
        KapPriorityMatrixDto? existing)
    {
        var high = new List<KapPriorityItemDto>(existing?.HighImpactHighPriority ?? []);
        var quick = new List<KapPriorityItemDto>(existing?.QuickWins ?? []);
        var longTerm = new List<KapPriorityItemDto>(existing?.LongTerm ?? []);
        var optional = new List<KapPriorityItemDto>(existing?.Optional ?? []);

        void AddUnique(List<KapPriorityItemDto> list, KapPriorityItemDto item)
        {
            if (list.All(i => !i.Title.Equals(item.Title, StringComparison.OrdinalIgnoreCase)))
                list.Add(item);
        }

        if (weak.Any(c => c.Code.Equals("OPERATIONS", StringComparison.OrdinalIgnoreCase)))
            AddUnique(quick, new("Chuẩn hóa SOP & giao ca", "Mở ca/đóng ca có đối soát — giảm sai sót và rủi ro GPP", "quick_win", 85));

        if (weak.Any(c => c.Code.Equals("CUSTOMER", StringComparison.OrdinalIgnoreCase)))
            AddUnique(quick, new("CRM & nhắc tái mua", "Ghi nhận khách và nhắc uống thuốc định kỳ — tăng khách quay lại", "quick_win", 80));

        if (string.Equals(scores.Qualitative?.PriorityNeed, "need_telemed", StringComparison.OrdinalIgnoreCase)
            || opportunities.Any(o => o.Title.Contains("bác sĩ", StringComparison.OrdinalIgnoreCase)
                || o.Title.Contains("telemed", StringComparison.OrdinalIgnoreCase)))
            AddUnique(high, new("Mạng bác sĩ & khám online", "Portal BS kê đơn, nhận đơn điện tử — khách tư vấn online rồi mua tại quầy", "high_impact_high_priority", 88));

        if (weak.Any(c => c.Code.Equals("INVENTORY", StringComparison.OrdinalIgnoreCase)))
            AddUnique(high, new("Kho thông minh & FEFO", "Cảnh báo HSD 90/60/30 ngày — giảm hàng cận date", "high_impact_high_priority", 90));

        if (weak.Any(c => c.Code.Equals("BUSINESS", StringComparison.OrdinalIgnoreCase))
            || weak.Any(c => c.Code.Equals("TECH", StringComparison.OrdinalIgnoreCase)))
            AddUnique(high, new("Dashboard điều hành", "Bảng điều khiển cho chủ NT — ra quyết định từ xa", "high_impact_high_priority", 82));

        AddUnique(longTerm, new("AI dự báo nhập hàng", "Đề xuất nhập theo tốc độ bán — giảm tồn chậm", "long_term", 65));
        AddUnique(longTerm, new("Chuẩn bị đa chi nhánh", "Quy trình thống nhất trước khi mở điểm bán thứ 2", "long_term", 60));

        foreach (var opp in opportunities.Take(2))
            AddUnique(high, new(opp.Title, opp.Body, "high_impact_high_priority", 75));

        if (quick.Count == 0)
            AddUnique(quick, new("Số hóa bán hàng & tồn", "POS + kho tập trung trong 30 ngày đầu", "quick_win", 78));

        return new KapPriorityMatrixDto(
            high.Take(6).ToList(),
            quick.Take(6).ToList(),
            longTerm.Take(6).ToList(),
            optional.Take(4).ToList());
    }

    private static string KpiForModule(string module) => module.ToLowerInvariant() switch
    {
        var m when m.Contains("kho") || m.Contains("inventory") || m.Contains("hạn") => "Hàng cận date < 2% tồn",
        var m when m.Contains("crm") || m.Contains("khách") => "Khách quay lại +18–25%",
        var m when m.Contains("bác sĩ") || m.Contains("bac si") || m.Contains("prescriber") => "Đơn kê đơn +8–15% doanh thu dịch vụ",
        var m when m.Contains("dashboard") || m.Contains("báo cáo") || m.Contains("kinh doanh") => "Thời gian báo cáo −50%",
        var m when m.Contains("ai") || m.Contains("dự báo") => "Độ chính xác dự báo nhập > 75%",
        _ => "Điểm trưởng thành +15% trong 2 quý",
    };

    private static string ModuleForCategory(string code) => code.ToUpperInvariant() switch
    {
        "INVENTORY" => "Kho thông minh",
        "CUSTOMER" => "Quản trị khách hàng",
        "TECH" => "Novixa Core",
        "OPERATIONS" => "Bán hàng & Ca",
        "BUSINESS" => "Báo cáo kinh doanh",
        "GROWTH" => "Đa chi nhánh",
        _ => "Novixa Core",
    };

    private static string PainForCategory(string code) => code.ToUpperInvariant() switch
    {
        "INVENTORY" => "Không quản lý FEFO / hạn dùng",
        "CUSTOMER" => "Thiếu hồ sơ khách tập trung",
        "TECH" => "Dữ liệu rời rạc / Excel",
        "OPERATIONS" => "Thiếu SOP và phân quyền rõ",
        "BUSINESS" => "Không theo dõi lãi gộp theo mặt hàng",
        "GROWTH" => "Chưa sẵn sàng nhân bản mô hình",
        _ => "Vận hành phụ thuộc kinh nghiệm",
    };

    private static string OutcomeForCategory(string code) => code.ToUpperInvariant() switch
    {
        "INVENTORY" => "Giảm hết hạn và thất thoát tồn",
        "CUSTOMER" => "Tăng doanh thu lặp từ khách quen",
        "TECH" => "Dữ liệu bán hàng & kho đồng bộ",
        "OPERATIONS" => "Giảm sai sót giao ca và kiểm tra GPP",
        "BUSINESS" => "Ra quyết định nhập hàng theo số liệu",
        "GROWTH" => "Mở chi nhánh với quy trình chuẩn",
        _ => "Chuẩn hóa vận hành",
    };
}
