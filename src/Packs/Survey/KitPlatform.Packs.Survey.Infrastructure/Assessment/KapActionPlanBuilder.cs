using KitPlatform.Packs.Survey;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal static class KapActionPlanBuilder
{
    public static KapActionPlanDto Build(
        IReadOnlyList<AssessmentRecommendationDto> recommendations,
        KapRoadmapDto? roadmap,
        KapConsultingBriefDto? brief)
    {
        var items = new List<KapActionPlanItemDto>();

        foreach (var rec in recommendations.OrderBy(r => r.Priority).Take(6))
        {
            var (timeline, owner) = TimelineAndOwner(rec.Priority, rec.ProductArea);
            items.Add(new KapActionPlanItemDto(
                rec.Title,
                rec.Body,
                PriorityLabel(rec.Priority),
                owner,
                timeline,
                rec.EstimateHint ?? "Cải thiện điểm năng lực nhóm tương ứng"));
        }

        if (roadmap?.Days30.Count > 0)
        {
            foreach (var item in roadmap.Days30.Take(Math.Max(0, 6 - items.Count)))
            {
                items.Add(new KapActionPlanItemDto(
                    item.Title,
                    item.Body,
                    "Cao",
                    "Chủ nhà thuốc / Quản lý",
                    "30 ngày",
                    "Hoàn thành mốc đầu tiên trong lộ trình chuyển đổi"));
            }
        }

        if (items.Count == 0 && brief?.ModuleFits.Count > 0)
        {
            foreach (var fit in brief.ModuleFits.Take(4))
            {
                items.Add(new KapActionPlanItemDto(
                    fit.ModuleName,
                    fit.PainResolved,
                    "Cao",
                    "Chủ nhà thuốc",
                    "30–90 ngày",
                    fit.Outcome90Days));
            }
        }

        var narrative = "Kế hoạch hành động được AI xếp theo mức ưu tiên — tập trung việc tạo tác động nhanh trước, "
            + "sau đó củng cố nền tảng dữ liệu và quy trình.";

        return new KapActionPlanDto(narrative, items);
    }

    private static string PriorityLabel(int priority) => priority switch
    {
        <= 1 => "Rất cao",
        <= 3 => "Cao",
        <= 5 => "Trung bình",
        _ => "Thấp",
    };

    private static (string Timeline, string Owner) TimelineAndOwner(int priority, string? productArea)
    {
        var timeline = priority switch
        {
            <= 1 => "2–4 tuần",
            <= 3 => "30–60 ngày",
            <= 5 => "60–90 ngày",
            _ => "90–180 ngày",
        };

        var owner = productArea?.Trim().ToLowerInvariant() switch
        {
            "inventory" or "kho" => "Quản lý kho / Chủ nhà thuốc",
            "crm" or "customer" => "Nhân viên bán hàng / Quản lý",
            "operations" or "pos" => "Quản lý ca / Chủ nhà thuốc",
            "finance" or "business" => "Chủ nhà thuốc / Kế toán",
            _ => "Chủ nhà thuốc",
        };

        return (timeline, owner);
    }
}
