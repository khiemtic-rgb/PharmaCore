using System.Text.Json;
using System.Text.RegularExpressions;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal static class AssessmentRuleEngine
{
    public sealed record Match(
        AssessmentRuleRow Rule,
        JsonDocument Payload);

    public static IReadOnlyList<Match> Evaluate(
        IReadOnlyList<AssessmentRuleRow> rules,
        decimal overallScore,
        IReadOnlyDictionary<string, decimal> categoryScores,
        IReadOnlyDictionary<string, decimal> dimensionScores,
        IReadOnlyDictionary<string, string> responseOptionCodes,
        IReadOnlyDictionary<string, decimal> questionScores)
    {
        var matches = new List<Match>();

        foreach (var rule in rules)
        {
            if (AssessmentExpressionEvaluator.Evaluate(
                    rule.Expression,
                    overallScore,
                    categoryScores,
                    dimensionScores,
                    responseOptionCodes,
                    questionScores))
            {
                matches.Add(new Match(rule, JsonDocument.Parse(rule.ActionPayloadJson)));
            }
        }

        return matches
            .OrderByDescending(m => m.Rule.Priority)
            .ThenBy(m => m.Rule.Code, StringComparer.Ordinal)
            .ToList();
    }
}
