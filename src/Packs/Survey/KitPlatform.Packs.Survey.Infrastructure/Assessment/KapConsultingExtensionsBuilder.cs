namespace KitPlatform.Packs.Survey.Infrastructure;

internal static class KapConsultingExtensionsBuilder
{
    private static readonly Dictionary<string, (string Name, string Current, string Target, string Module, string Feature)> GapTemplates =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["INVENTORY"] = ("Kho", "Excel / sổ tay", "Quản trị tập trung", "Kho thông minh", "Xuất kho theo hạn dùng · Cảnh báo hạn sử dụng"),
            ["CUSTOMER"] = ("Khách hàng", "Không có hệ thống quản trị khách", "Quản trị & giữ chân", "Ví sức khỏe", "Hồ sơ khách · Nhắc tái mua"),
            ["TECH"] = ("Dữ liệu", "Dữ liệu rời rạc", "Nền tảng tích hợp", "Novixa Core", "Bán hàng · Kho · Báo cáo"),
            ["OPERATIONS"] = ("Quy trình", "Phụ thuộc kinh nghiệm", "Chuẩn hóa vận hành", "Bán hàng & Ca", "Mở ca · Đối soát"),
            ["BUSINESS"] = ("Kinh doanh", "Không có bảng điều khiển", "Bảng điều khiển BI", "Báo cáo kinh doanh", "Lãi gộp · Sản phẩm bán chạy"),
            ["GROWTH"] = ("Mở rộng", "Chưa sẵn sàng nhân bản", "Quản trị chuỗi", "Đa chi nhánh", "Tập trung · Chuyển kho"),
        };

    private static readonly Dictionary<string, (string Code, string Name)> ReadinessMap =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["TECH"] = ("DATA", "Dữ liệu"),
            ["INVENTORY"] = ("INVENTORY", "Kho"),
            ["CUSTOMER"] = ("CRM", "Quản trị khách hàng"),
            ["OPERATIONS"] = ("PROCESS", "Quy trình"),
            ["BUSINESS"] = ("FINANCE", "Tài chính"),
            ["GROWTH"] = ("SCALE", "Mở rộng"),
        };

    public sealed record CategoryInsight(
        string CategoryName,
        string ScoreLabel,
        string Assessment,
        string Recommendation);

    public static IReadOnlyList<CategoryInsight> BuildCategoryInsights(
        IReadOnlyList<AssessmentCategoryScoreDto> categories,
        KapBenchmarkAnalysisDto? benchmark)
    {
        var benchMap = benchmark?.Categories.ToDictionary(c => c.Code, StringComparer.OrdinalIgnoreCase)
            ?? new Dictionary<string, KapBenchmarkCategoryDto>(StringComparer.OrdinalIgnoreCase);

        return categories
            .OrderBy(c => c.Score)
            .Select(cat =>
            {
                var displayName = $"{KapPharmacyScoreDisplay.Letter(cat.Code)}. {KapPharmacyLanguage.SimpleName(cat.Code, cat.Name)}";
                var assessment = KapPharmacyLanguage.AssessmentLine(cat.Code, cat.Name, cat.Score);
                var situation = KapPharmacyLanguage.Situation(cat.Code);
                if (!string.IsNullOrWhiteSpace(situation))
                    assessment += " " + situation;

                if (benchMap.TryGetValue(cat.Code, out var bench) && bench.Delta is decimal delta)
                {
                    assessment += delta < -0.2m
                        ? $" Chậm hơn nhóm tham chiếu {Math.Abs(delta):F1} điểm — cần ưu tiên."
                        : delta > 0.2m
                            ? $" Trên nhóm tham chiếu {delta:F1} điểm — duy trì và tối ưu."
                            : " Gần mức trung bình ngành.";
                }

                var recommendation = KapPharmacyLanguage.Recommendation(cat.Code);
                return new CategoryInsight(
                    displayName,
                    KapPharmacyScoreDisplay.Format(cat.Score),
                    assessment,
                    recommendation);
            })
            .ToList();
    }

    private static string ScoreBandLabel(decimal scorePct) => scorePct switch
    {
        >= 75 => "mức khá vững, cần duy trì và tối ưu",
        >= 55 => "mức trung bình, cần củng cố quy trình và công cụ",
        >= 35 => "mức yếu, ưu tiên số hóa trong 60 ngày tới",
        _ => "mức rất yếu, có rủi ro vận hành và mất doanh thu nếu không hành động",
    };

    public sealed record ConsultingExtensions(
        KapExecutiveDashboardDto ExecutiveDashboard,
        KapNovixaReadinessDto NovixaReadiness,
        KapGapAnalysisDto GapAnalysis,
        IReadOnlyList<KapRoiMetricDto> RoiMetrics,
        IReadOnlyList<KapModuleStarDto> ModuleRecommendations,
        IReadOnlyList<KapInvestmentPhaseDto> InvestmentPhases,
        IReadOnlyList<KapBusinessImpactForecastDto> BusinessImpactForecast,
        IReadOnlyList<KapModuleMappingItemDto> ModuleMappings,
        KapTransformationRoadmapDto TransformationRoadmap,
        KapCostBenefitAnalysisDto CostBenefit,
        KapImplementationTimelineDto ImplementationTimeline,
        KapRiskRegisterDto RiskRegister);

    public static ConsultingExtensions Build(
        string orgName,
        string? orgScale,
        KapReportScoresDto scores,
        KapMaturityAssessmentDto? maturity,
        IReadOnlyList<KapRootCauseDto> rootCauses,
        IReadOnlyList<KapRiskItemDto> risks,
        IReadOnlyList<KapOpportunityItemDto> opportunities,
        KapConsultingBriefDto brief)
    {
        var weak = scores.Categories.OrderBy(c => c.Score).Take(3).ToList();
        var digitalReadiness = scores.OverallPct;
        var novixaFit = ComputeNovixaFit(scores, maturity);

        var dashboard = BuildExecutiveDashboard(
            orgName, scores, maturity, weak, rootCauses, risks, opportunities, digitalReadiness, novixaFit);

        var readiness = BuildReadiness(scores, novixaFit);
        var gap = BuildGapAnalysis(weak, brief);
        var roiMetrics = KapScaleBasedRoiBuilder.BuildMetrics(orgScale, scores, maturity);
        var moduleStars = BuildModuleStars(weak, brief.ModuleFits);
        var investment = BuildInvestmentPhases(brief.ModuleFits);
        var forecast = KapScaleBasedRoiBuilder.BuildForecast(orgScale, scores, maturity);
        var mappings = BuildModuleMappings(weak, rootCauses);
        var transform = BuildTransformationRoadmap(brief.ModuleFits);
        var costBenefit = KapScaleBasedRoiBuilder.BuildCostBenefit(orgName, orgScale, scores, brief, roiMetrics);
        var timeline = BuildImplementationTimeline(brief.ModuleFits, investment);
        var riskRegister = BuildRiskRegister(risks, rootCauses, brief);

        return new ConsultingExtensions(
            dashboard, readiness, gap, roiMetrics, moduleStars, investment, forecast, mappings, transform,
            costBenefit, timeline, riskRegister);
    }

    private static decimal ComputeNovixaFit(KapReportScoresDto scores, KapMaturityAssessmentDto? maturity)
    {
        var baseFit = scores.OverallPct;
        var maturityBoost = maturity?.Level switch
        {
            <= 2 => 12m,
            3 => 8m,
            4 => 5m,
            _ => 2m,
        };
        return Math.Clamp(Math.Round(baseFit + maturityBoost, 0), 35, 95);
    }

    private static KapExecutiveDashboardDto BuildExecutiveDashboard(
        string orgName,
        KapReportScoresDto scores,
        KapMaturityAssessmentDto? maturity,
        IReadOnlyList<AssessmentCategoryScoreDto> weak,
        IReadOnlyList<KapRootCauseDto> rootCauses,
        IReadOnlyList<KapRiskItemDto> risks,
        IReadOnlyList<KapOpportunityItemDto> opportunities,
        decimal digitalReadiness,
        decimal novixaFit)
    {
        var problems = weak
            .Select(c => $"Nhóm {c.Name}: {c.ScorePct:F0}% — {ScoreBandLabel(c.ScorePct)}")
            .Concat(rootCauses.Take(Math.Max(0, 3 - weak.Count)).Select(r => r.Title))
            .Take(3)
            .ToList();

        var topRisks = risks
            .OrderByDescending(r => r.Level.Equals("high", StringComparison.OrdinalIgnoreCase) ? 2 : 1)
            .Take(3)
            .Select(r => $"{r.Title} ({KapVietnameseLabels.RiskLevel(r.Level)})")
            .ToList();

        var topOpps = opportunities
            .Take(3)
            .Select(o => o.Title)
            .ToList();

        if (topOpps.Count == 0)
            topOpps = weak.Select(c => $"Cải thiện {c.Name} trong 30–45 ngày").Take(3).ToList();

        var successPct = Math.Min(95, Math.Round(novixaFit + (100 - scores.OverallPct) * 0.3m, 0));
        var maturityLabel = maturity is null
            ? KapVietnameseLabels.MaturityLevel(1)
            : KapVietnameseLabels.MaturityLevel(maturity.Level, maturity.Name);

        var aiLine = $"AI đánh giá: {orgName} đạt {scores.OverallPct:F0}% sẵn sàng chuyển đổi số, "
            + $"phù hợp triển khai Novixa giai đoạn 1 ({novixaFit:F0}%). "
            + $"Nếu chuẩn hóa {weak.FirstOrDefault()?.Name ?? "vận hành"} trước, "
            + $"khả năng thành công sau triển khai ước tính {successPct:F0}%.";

        return new KapExecutiveDashboardDto(
            problems, topRisks, topOpps, digitalReadiness, novixaFit, aiLine);
    }

    private static KapNovixaReadinessDto BuildReadiness(KapReportScoresDto scores, decimal overallFit)
    {
        var dims = new List<KapReadinessDimensionDto>();
        foreach (var cat in scores.Categories)
        {
            if (!ReadinessMap.TryGetValue(cat.Code, out var map))
                continue;
            dims.Add(new KapReadinessDimensionDto(map.Code, map.Name, cat.ScorePct));
        }

        if (dims.Count == 0)
        {
            dims.Add(new KapReadinessDimensionDto("OVERALL", "Tổng thể", scores.OverallPct));
        }

        var avg = dims.Count > 0 ? dims.Average(d => d.ScorePct) : scores.OverallPct;
        var pct = Math.Round((avg + overallFit) / 2m, 0);
        var status = pct switch
        {
            >= 75 => "Sẵn sàng triển khai",
            >= 55 => "Cần chuẩn hóa trước khi triển khai",
            _ => "Nên bắt đầu giai đoạn 1 — chuẩn hóa dữ liệu",
        };

        return new KapNovixaReadinessDto(pct, status, dims);
    }

    private static KapGapAnalysisDto BuildGapAnalysis(
        IReadOnlyList<AssessmentCategoryScoreDto> weak,
        KapConsultingBriefDto brief)
    {
        var items = new List<KapGapItemDto>();
        foreach (var cat in weak)
        {
            if (!GapTemplates.TryGetValue(cat.Code, out var t))
                continue;
            items.Add(new KapGapItemDto(t.Current, t.Target, t.Module, t.Feature));
        }

        if (items.Count == 0)
        {
            items.Add(new KapGapItemDto(
                "Excel / sổ tay",
                "Quản trị tập trung",
                "Novixa Core",
                "POS · Kho · Báo cáo"));
        }

        var weakest = weak.FirstOrDefault();
        var narrative = weakest is not null
            ? $"Khoảng cách lớn nhất nằm ở nhóm {weakest.Name} ({weakest.ScorePct:F0}%) — cần đóng gap này trước khi mở rộng quy mô hoặc triển khai thêm phân hệ."
            : "Phân tích khoảng cách giữa hiện trạng vận hành và mục tiêu quản trị số hóa toàn diện.";

        return new KapGapAnalysisDto(narrative, items);
    }

    private static IReadOnlyList<KapRoiMetricDto> BuildRoiMetrics(
        KapReportScoresDto scores,
        KapMaturityAssessmentDto? maturity)
    {
        var factor = maturity?.Level <= 2 ? 1.1m : 1m;
        var weak = scores.Categories.OrderBy(c => c.Score).FirstOrDefault();
        var inventoryWeak = weak?.Code.Equals("INVENTORY", StringComparison.OrdinalIgnoreCase) == true;
        var customerWeak = weak?.Code.Equals("CUSTOMER", StringComparison.OrdinalIgnoreCase) == true;
        var inventoryFactor = inventoryWeak ? 1.2m : 1m;
        var customerFactor = customerWeak ? 1.15m : 1m;

        return
        [
            new("Giảm thất thoát tồn kho", $"{15 * factor * inventoryFactor:F0}–{25 * factor * inventoryFactor:F0}%",
                inventoryWeak
                    ? $"Nhóm kho chỉ đạt {weak!.ScorePct:F0}% — kiểm soát nhập — xuất — tồn theo thời gian thực là ưu tiên số 1"
                    : "Kiểm soát nhập — xuất — tồn theo thời gian thực"),
            new("Giảm thời gian kiểm kê", "70%", "Kiểm kê số hóa trên thiết bị di động"),
            new("Giảm hàng cận hạn / hết hạn", "60%", "FEFO tự động và cảnh báo hạn sử dụng 90/60/30 ngày"),
            new("Tăng tỷ lệ khách quay lại", $"{18 * factor * customerFactor:F0}–{25 * factor * customerFactor:F0}%",
                customerWeak
                    ? $"Nhóm khách hàng yếu ({weak!.ScorePct:F0}%) — cần quản trị khách hàng và nhắc tái mua"
                    : "Quản trị khách hàng, nhắc tái mua và chương trình loyalty"),
            new("Tiết kiệm thời gian quản lý", "2 giờ/ngày", "Báo cáo tự động, giảm đối chiếu Excel"),
            new("Chuẩn hóa quy trình vận hành",
                $"Điểm {scores.OverallPct:F0}% → {Math.Min(95, scores.OverallPct + 18):F0}%",
                $"Tập trung cải thiện nhóm yếu {weak?.Name ?? "vận hành"} ({weak?.ScorePct:F0}%)"),
        ];
    }

    private static IReadOnlyList<KapModuleStarDto> BuildModuleStars(
        IReadOnlyList<AssessmentCategoryScoreDto> weak,
        IReadOnlyList<KapSoftwareModuleFitDto> moduleFits)
    {
        var stars = new List<KapModuleStarDto>();
        foreach (var fit in moduleFits)
        {
            var code = weak.FirstOrDefault(w =>
                fit.ModuleName.Contains(w.Name, StringComparison.OrdinalIgnoreCase) ||
                fit.PainResolved.Contains(w.Name, StringComparison.OrdinalIgnoreCase))?.Code ?? "CORE";

            var starCount = Math.Clamp((int)Math.Round((100 - (weak.FirstOrDefault(c => c.Code == code)?.ScorePct ?? 50)) / 18m) + 2, 3, 5);
            stars.Add(new KapModuleStarDto(
                code,
                fit.ModuleName.Replace("Novixa — ", ""),
                starCount,
                fit.PainResolved));
        }

        if (stars.Count == 0)
        {
            stars.Add(new KapModuleStarDto("CORE", "Novixa Core", 5, "POS + Kho + Báo cáo cơ bản"));
        }

        return stars;
    }

    private static IReadOnlyList<KapInvestmentPhaseDto> BuildInvestmentPhases(
        IReadOnlyList<KapSoftwareModuleFitDto> moduleFits)
    {
        var primary = moduleFits.FirstOrDefault()?.ModuleName.Replace("Novixa — ", "") ?? "Novixa Core";
        var secondary = moduleFits.Skip(1).FirstOrDefault()?.ModuleName.Replace("Novixa — ", "") ?? "CRM";
        var tertiary = moduleFits.Skip(2).FirstOrDefault()?.ModuleName.Replace("Novixa — ", "") ?? "AI & Dashboard";

        return
        [
            new(1, "Giai đoạn 1 — Novixa Core", primary,
                "Triển khai POS, kho và báo cáo cơ bản — thay thế Excel.",
                "Tháng 1–2"),
            new(2, "Giai đoạn 2 — CRM & giữ chân", secondary,
                "Hồ sơ khách hàng, nhắc tái mua, loyalty.",
                "Tháng 3–4"),
            new(3, "Giai đoạn 3 — AI & Dashboard", tertiary,
                "Dự báo nhập hàng, dashboard điều hành, cảnh báo chủ động.",
                "Tháng 5–6"),
        ];
    }

    private static IReadOnlyList<KapBusinessImpactForecastDto> BuildImpactForecast(
        KapReportScoresDto scores,
        KapMaturityAssessmentDto? maturity)
    {
        var boost = maturity?.Level <= 2 ? 1.15m : 1m;
        return
        [
            new("Doanh thu", $"+{12 * boost:F0}%", "up"),
            new("Tồn kho", $"-{18 * boost:F0}%", "down"),
            new("Hàng cận hạn", "-65%", "down"),
            new("Khách quay lại", $"+{23 * boost:F0}%", "up"),
            new("Thời gian quản lý", "-50%", "down"),
            new("Điểm trưởng thành", $"{scores.OverallPct:F0}% → {Math.Min(95, scores.OverallPct + 18):F0}%", "up"),
        ];
    }

    private static IReadOnlyList<KapModuleMappingItemDto> BuildModuleMappings(
        IReadOnlyList<AssessmentCategoryScoreDto> weak,
        IReadOnlyList<KapRootCauseDto> rootCauses)
    {
        var items = new List<KapModuleMappingItemDto>();
        foreach (var cat in weak)
        {
            if (!GapTemplates.TryGetValue(cat.Code, out var t))
                continue;
            items.Add(new KapModuleMappingItemDto(
                $"Điểm yếu: {cat.Name} ({cat.ScorePct:F0}%)",
                t.Module,
                t.Feature));
        }

        foreach (var rc in rootCauses.Take(2))
        {
            items.Add(new KapModuleMappingItemDto(rc.Title, "Novixa Core", rc.Body));
        }

        if (rootCauses.Any(rc => rc.Code.Equals("RC_C6_TELEMED", StringComparison.OrdinalIgnoreCase)))
        {
            items.Insert(0, new KapModuleMappingItemDto(
                "Chưa kết nối bác sĩ / khám online",
                "Mạng bác sĩ & khám online",
                "Portal BS · Đơn điện tử · Tích hợp POS"));
        }

        return items.DistinctBy(m => m.Problem).Take(6).ToList();
    }

    private static KapTransformationRoadmapDto BuildTransformationRoadmap(
        IReadOnlyList<KapSoftwareModuleFitDto> moduleFits)
    {
        var core = moduleFits.FirstOrDefault()?.ModuleName.Replace("Novixa — ", "") ?? "Novixa Core";
        var crm = moduleFits.Skip(1).FirstOrDefault()?.ModuleName.Replace("Novixa — ", "") ?? "CRM";
        var ai = "AI dự báo & cảnh báo";

        var phases = new List<KapTransformationPhaseDto>
        {
            new(1, "Chuẩn hóa dữ liệu", "Rà soát danh mục, tồn kho, khách hàng — làm sạch trước khi số hóa.", "Dữ liệu"),
            new(2, "Triển khai Novixa Core", "POS + Kho + Báo cáo — vận hành số hóa trong 2–4 tuần.", core),
            new(3, "CRM & giữ chân", "Hồ sơ KH, nhắc tái mua, loyalty.", crm),
            new(4, "AI & tự động hóa", "Đề xuất nhập hàng, cảnh báo HSD, dự báo nhu cầu.", ai),
            new(5, "Dashboard điều hành", "Bảng điều khiển cho chủ nhà thuốc — ra quyết định từ xa.", "Dashboard BI"),
        };

        return new KapTransformationRoadmapDto(
            phases,
            "Lộ trình chuyển đổi số theo giai đoạn — không triển khai dồn một lần, giảm rủi ro và tối ưu hiệu quả.");
    }

    private static KapCostBenefitAnalysisDto BuildCostBenefit(
        string orgName,
        KapReportScoresDto scores,
        KapMaturityAssessmentDto? maturity,
        KapConsultingBriefDto brief,
        IReadOnlyList<KapRoiMetricDto> roiMetrics)
    {
        var targetPct = Math.Min(95, scores.OverallPct + 18);
        var items = new List<KapCostBenefitItemDto>
        {
            new("POS & kho tập trung", "Giai đoạn 1 — Novixa Core", "Dữ liệu bán hàng và tồn theo thời gian thực", "Sau 30 ngày"),
            new("Giảm thất thoát tồn kho", "Kho thông minh, cảnh báo tồn", roiMetrics.FirstOrDefault()?.Range ?? "15–25%", "Tháng 2–3"),
            new("Tiết kiệm thời gian quản lý", "Đào tạo 2–3 buổi", "2 giờ/ngày", "Ngay tháng 1"),
            new("Tăng khách quay lại", "CRM giai đoạn 2", "+18–25% doanh thu lặp", "Tháng 3–6"),
            new("Giảm hàng cận hạn", "Tích hợp kho thông minh", "-60% hàng cận date", "Tháng 2–4"),
        };

        var net = $"{orgName} có thể chuẩn hóa vận hành và giảm phụ thuộc chủ có mặt tại quầy nếu triển khai theo giai đoạn — "
            + $"điểm hiện tại {scores.OverallPct:F0}% → mục tiêu ~{targetPct:F0}% trong 2 quý.";

        return new KapCostBenefitAnalysisDto(
            brief.RoiStory.Summary,
            items,
            net);
    }

    private static KapImplementationTimelineDto BuildImplementationTimeline(
        IReadOnlyList<KapSoftwareModuleFitDto> moduleFits,
        IReadOnlyList<KapInvestmentPhaseDto> phases)
    {
        var core = moduleFits.FirstOrDefault()?.ModuleName.Replace("Novixa — ", "") ?? "Novixa Core";
        var milestones = new List<KapTimelineMilestoneDto>
        {
            new("Tuần 1–2", "Khảo sát hiện trạng & chuẩn hóa danh mục", "Bộ dữ liệu sạch sẵn sàng nhập"),
            new("Tuần 3–4", $"Triển khai {core}", "POS + kho hoạt động thử nghiệm"),
            new("Tháng 2", "Đào tạo nhân viên & chạy song song", "100% giao dịch trên hệ thống"),
            new("Tháng 3", phases.Skip(1).FirstOrDefault()?.Title ?? "CRM", "Hồ sơ KH + nhắc tái mua"),
            new("Tháng 4–6", phases.Skip(2).FirstOrDefault()?.Title ?? "AI & Dashboard", "KPI 90 ngày đạt mục tiêu"),
        };

        return new KapImplementationTimelineDto(
            "Tiến độ triển khai điển hình — có thể rút ngắn nếu nhà thuốc đã có dữ liệu sẵn sàng.",
            milestones);
    }

    private static KapRiskRegisterDto BuildRiskRegister(
        IReadOnlyList<KapRiskItemDto> risks,
        IReadOnlyList<KapRootCauseDto> rootCauses,
        KapConsultingBriefDto brief)
    {
        var items = new List<KapRiskRegisterItemDto>();
        var idx = 1;
        foreach (var risk in risks.Take(5))
        {
            items.Add(new KapRiskRegisterItemDto(
                $"R{idx++:D2}",
                risk.Title,
                KapVietnameseLabels.RiskLevel(risk.Level),
                risk.Body,
                "Triển khai module Novixa tương ứng + đào tạo quy trình chuẩn",
                "Chủ nhà thuốc / Quản lý"));
        }

        foreach (var rc in rootCauses.Take(Math.Max(0, 5 - items.Count)))
        {
            items.Add(new KapRiskRegisterItemDto(
                $"R{idx++:D2}",
                rc.Title,
                "Trung bình",
                rc.Body,
                "Xử lý nguyên nhân gốc trong 30 ngày đầu triển khai",
                "Đội vận hành"));
        }

        if (items.Count == 0)
        {
            items.Add(new KapRiskRegisterItemDto(
                "R01",
                "Trì hoãn chuyển đổi số",
                "Cao",
                brief.CostOfInaction,
                "Bắt đầu giai đoạn 1 trong 30 ngày",
                "Ban lãnh đạo"));
        }

        return new KapRiskRegisterDto(
            "Sổ đăng ký rủi ro — theo dõi và giảm thiểu trong suốt quá trình triển khai Novixa.",
            items);
    }
}
