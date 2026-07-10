using System.Text.RegularExpressions;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal static class AssessmentExpressionEvaluator
{
    public static bool Evaluate(
        string expression,
        decimal overallScore,
        IReadOnlyDictionary<string, decimal> categoryScores,
        IReadOnlyDictionary<string, decimal> dimensionScores,
        IReadOnlyDictionary<string, string> responseOptionCodes,
        IReadOnlyDictionary<string, decimal> questionScores)
    {
        var trimmed = expression.Trim();

        var responseScoreMatch = Regex.Match(
            trimmed,
            @"^response\.(?<qcode>[A-Z0-9_]+)\.score\s*(?<op><=|>=|==|<|>)\s*(?<value>-?\d+(?:\.\d+)?)$",
            RegexOptions.IgnoreCase);
        if (responseScoreMatch.Success)
        {
            var qCode = responseScoreMatch.Groups["qcode"].Value;
            if (!questionScores.TryGetValue(qCode, out var score))
                return false;
            return Compare(
                score,
                responseScoreMatch.Groups["op"].Value,
                decimal.Parse(responseScoreMatch.Groups["value"].Value));
        }

        var responseMatch = Regex.Match(
            trimmed,
            @"^response\.(?<qcode>[A-Z0-9_]+)\.option_code\s*=\s*'(?<ocode>[^']+)'$",
            RegexOptions.IgnoreCase);
        if (responseMatch.Success)
        {
            var qCode = responseMatch.Groups["qcode"].Value;
            var oCode = responseMatch.Groups["ocode"].Value;
            return responseOptionCodes.TryGetValue(qCode, out var actual)
                && string.Equals(actual, oCode, StringComparison.OrdinalIgnoreCase);
        }

        var categoryMatch = Regex.Match(
            trimmed,
            @"^category\.(?<code>[A-Z0-9_]+)\.score\s*(?<op><=|>=|==|<|>)\s*(?<value>-?\d+(?:\.\d+)?)$",
            RegexOptions.IgnoreCase);
        if (categoryMatch.Success)
        {
            var code = categoryMatch.Groups["code"].Value;
            if (!categoryScores.TryGetValue(code, out var score))
                return false;
            return Compare(score, categoryMatch.Groups["op"].Value, decimal.Parse(categoryMatch.Groups["value"].Value));
        }

        var dimensionMatch = Regex.Match(
            trimmed,
            @"^dimension\.(?<code>[A-Z0-9_]+)\.score\s*(?<op><=|>=|==|<|>)\s*(?<value>-?\d+(?:\.\d+)?)$",
            RegexOptions.IgnoreCase);
        if (dimensionMatch.Success)
        {
            var code = dimensionMatch.Groups["code"].Value;
            if (!dimensionScores.TryGetValue(code, out var score))
                return false;
            return Compare(score, dimensionMatch.Groups["op"].Value, decimal.Parse(dimensionMatch.Groups["value"].Value));
        }

        var andParts = Regex.Split(trimmed, @"\s+AND\s+", RegexOptions.IgnoreCase);
        if (andParts.Length > 1)
        {
            return andParts.All(part => Evaluate(
                part,
                overallScore,
                categoryScores,
                dimensionScores,
                responseOptionCodes,
                questionScores));
        }

        var overallMatch = Regex.Match(
            trimmed,
            @"^overall\.score\s*(?<op><=|>=|==|<|>)\s*(?<value>-?\d+(?:\.\d+)?)$",
            RegexOptions.IgnoreCase);
        if (overallMatch.Success)
        {
            return Compare(
                overallScore,
                overallMatch.Groups["op"].Value,
                decimal.Parse(overallMatch.Groups["value"].Value));
        }

        return false;
    }

    private static bool Compare(decimal left, string op, decimal right) => op switch
    {
        "<" => left < right,
        "<=" => left <= right,
        ">" => left > right,
        ">=" => left >= right,
        "==" => left == right,
        _ => false,
    };
}
