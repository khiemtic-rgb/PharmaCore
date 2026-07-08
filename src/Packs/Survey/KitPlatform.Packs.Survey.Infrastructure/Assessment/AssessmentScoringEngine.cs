using System.Text.Json;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal static class AssessmentScoringEngine
{
    public sealed record Result(
        decimal OverallScore,
        decimal OverallPct,
        IReadOnlyList<AssessmentDimensionScoreWrite> DimensionScores,
        IReadOnlyList<AssessmentCategoryScoreWrite> CategoryScores,
        IReadOnlyDictionary<string, decimal> CategoryScoreByCode,
        IReadOnlyDictionary<string, decimal> DimensionScoreByCode,
        AssessmentQualitativeContext Qualitative);

    public sealed record AssessmentQualitativeContext(
        string? PainPointTag,
        string? PriorityNeedTag);

    public static Result Compute(IReadOnlyList<AssessmentScoringRow> rows)
    {
        var dimensionGroups = rows
            .GroupBy(r => r.DimensionId)
            .Select(g =>
            {
                var first = g.First();
                var questionScores = g
                    .Where(r => r.Scorable && r.ResponseOptionId.HasValue && r.OptionScore.HasValue)
                    .Select(r => (Score: (decimal)r.OptionScore!.Value * r.QuestionWeight, Weight: r.QuestionWeight))
                    .ToList();

                var score = WeightedAverage(questionScores);
                return new
                {
                    first.DimensionId,
                    first.DimensionCode,
                    first.DimensionName,
                    first.DimensionWeight,
                    first.CategoryId,
                    first.CategoryCode,
                    Score = score,
                };
            })
            .ToList();

        var categoryGroups = dimensionGroups
            .GroupBy(d => d.CategoryId)
            .Select(g =>
            {
                var first = g.First();
                var items = g.Select(d => (Score: d.Score * d.DimensionWeight, Weight: d.DimensionWeight)).ToList();
                var score = WeightedAverage(items);
                return new
                {
                    first.CategoryId,
                    first.CategoryCode,
                    Score = score,
                };
            })
            .ToList();

        var overallItems = categoryGroups
            .Select(c =>
            {
                var weight = rows.First(r => r.CategoryId == c.CategoryId).CategoryWeight;
                return (Score: c.Score * weight, Weight: weight);
            })
            .ToList();

        var overallScore = WeightedAverage(overallItems);
        var overallPct = ScoreToPct(overallScore);

        var dimensionScores = dimensionGroups
            .Select(d => new AssessmentDimensionScoreWrite(
                d.DimensionId,
                RoundScore(d.Score),
                ScoreToPct(d.Score)))
            .ToList();

        var categoryScores = categoryGroups
            .Select(c => new AssessmentCategoryScoreWrite(
                c.CategoryId,
                RoundScore(c.Score),
                ScoreToPct(c.Score)))
            .ToList();

        var painRow = rows.FirstOrDefault(r => r.QuestionCode == "G4" && r.ResponseOptionId.HasValue);
        var needRow = rows.FirstOrDefault(r => r.QuestionCode == "G5" && r.ResponseOptionId.HasValue);

        return new Result(
            RoundScore(overallScore),
            overallPct,
            dimensionScores,
            categoryScores,
            categoryGroups.ToDictionary(c => c.CategoryCode, c => RoundScore(c.Score)),
            dimensionGroups.ToDictionary(d => d.DimensionCode, d => RoundScore(d.Score)),
            new AssessmentQualitativeContext(
                ExtractTag(painRow?.OptionMetadataJson),
                ExtractTag(needRow?.OptionMetadataJson)));
    }

    public static decimal ScoreToPct(decimal score) =>
        Math.Round((score - 1m) / 3m * 100m, 1);

    private static decimal WeightedAverage(IReadOnlyList<(decimal Score, decimal Weight)> items)
    {
        if (items.Count == 0)
            return 0m;

        var totalWeight = items.Sum(i => i.Weight);
        if (totalWeight <= 0)
            return 0m;

        return items.Sum(i => i.Score) / totalWeight;
    }

    private static decimal RoundScore(decimal score) => Math.Round(score, 2);

    private static string? ExtractTag(string? metadataJson)
    {
        if (string.IsNullOrWhiteSpace(metadataJson))
            return null;

        try
        {
            using var doc = JsonDocument.Parse(metadataJson);
            if (doc.RootElement.TryGetProperty("tag", out var tag))
                return tag.GetString();
        }
        catch (JsonException)
        {
            // ignore malformed metadata
        }

        return null;
    }
}
