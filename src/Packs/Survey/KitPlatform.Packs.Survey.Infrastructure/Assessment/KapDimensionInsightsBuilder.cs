using KitPlatform.Packs.Survey;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal static class KapDimensionInsightsBuilder
{
    public sealed record DimensionInsight(
        string DimensionName,
        string CategoryName,
        string ScoreLabel,
        string Assessment,
        string Recommendation);

    public static IReadOnlyList<DimensionInsight> Build(
        IReadOnlyList<AssessmentDimensionScoreDto> dimensions,
        IReadOnlyList<AssessmentCategoryScoreDto> categories)
    {
        if (dimensions.Count == 0)
            return [];

        return dimensions
            .OrderBy(d => d.Score)
            .Select(dim =>
            {
                var catName = KapPharmacyLanguage.SimpleName(dim.CategoryCode);
                var dimName = KapVietnameseText.Display(dim.Name);
                var scoreTen = KapPharmacyScoreDisplay.Format(dim.Score);
                var assessment = $"{dimName} ({catName}): {scoreTen} — {KapPharmacyLanguage.BandLabelTen(dim.Score)}.";
                var recommendation = dim.Score < 2.2m
                    ? KapPharmacyLanguage.Recommendation(dim.CategoryCode)
                    : $"Duy trì thói quen tốt ở mảng {catName.ToLowerInvariant()} và rà soát lại mỗi tháng.";
                return new DimensionInsight(dimName, catName, scoreTen, assessment, recommendation);
            })
            .ToList();
    }
}
