using System.Text.Json;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal static class AssessmentMetadataHelper
{
    public static IReadOnlyDictionary<string, object>? ParseQuestionMetadata(string? json)
    {
        if (string.IsNullOrWhiteSpace(json) || json == "{}")
            return null;

        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
                return null;

            var dict = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                dict[prop.Name] = prop.Value.ValueKind switch
                {
                    JsonValueKind.String => prop.Value.GetString() ?? "",
                    JsonValueKind.Number when prop.Value.TryGetInt32(out var i) => i,
                    JsonValueKind.True => true,
                    JsonValueKind.False => false,
                    JsonValueKind.Object => prop.Value.Clone(),
                    JsonValueKind.Array => prop.Value.Clone(),
                    _ => prop.Value.ToString(),
                };
            }

            return dict;
        }
        catch
        {
            return null;
        }
    }
}
