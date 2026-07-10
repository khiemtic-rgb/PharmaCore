using SkiaSharp;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal static class KapChartImageGenerator
{
    public sealed record RadarSeries(string Label, IReadOnlyList<decimal> Values, SKColor Color, bool Dashed = false);

    public static byte[] RenderCategoryRadar(
        IReadOnlyList<AssessmentCategoryScoreDto> categories,
        IReadOnlyList<KapBenchmarkCategoryDto>? benchmark = null,
        int width = 520,
        int height = 480)
    {
        var labels = categories.Select(c => ShortLabel(c.Name)).ToList();
        var values = categories.Select(c => Math.Clamp(c.Score / 4m, 0m, 1m)).ToList();
        var rawScores = categories.Select(c => c.Score).ToList();
        var benchValues = benchmark?.Count == categories.Count
            ? benchmark.Select(b => b.CohortMean.HasValue ? Math.Clamp(b.CohortMean.Value / 4m, 0m, 1m) : 0m).ToList()
            : null;
        var hasBenchmark = benchValues is not null && benchValues.Any(v => v > 0);

        var series = new List<RadarSeries>
        {
            new("Doanh nghiệp", values, SKColor.Parse("#0f766e")),
        };

        if (hasBenchmark)
            series.Add(new("Ngưỡng tham chiếu", benchValues!, SKColor.Parse("#f59e0b"), Dashed: true));

        return RenderRadar(labels, series, rawScores, width, height, "Biểu đồ radar — điểm năng lực theo nhóm (thang 0–4)");
    }

    public static byte[] RenderCategoryBars(
        IReadOnlyList<AssessmentCategoryScoreDto> categories,
        IReadOnlyList<KapBenchmarkCategoryDto>? benchmark,
        int width = 520,
        int height = 320)
    {
        using var surface = SKSurface.Create(new SKImageInfo(width, height));
        var canvas = surface.Canvas;
        canvas.Clear(SKColors.White);

        using var titlePaint = new SKPaint { Color = SKColor.Parse("#0f172a"), TextSize = 18, IsAntialias = true, Typeface = SKTypeface.FromFamilyName("Arial", SKFontStyle.Bold) };
        canvas.DrawText("So sánh điểm theo nhóm (thang 0–4)", 16, 22, titlePaint);

        using var legendPaint = new SKPaint { Color = SKColor.Parse("#64748b"), TextSize = 11, IsAntialias = true };
        canvas.DrawText("■ Doanh nghiệp   |   — Ngưỡng tham chiếu", 16, 38, legendPaint);

        var benchMap = benchmark?.ToDictionary(b => b.Code, b => b.CohortMean) ?? new Dictionary<string, decimal?>();
        var rowHeight = 36f;
        var startY = 52f;
        var maxBarW = width - 200f;

        for (var i = 0; i < categories.Count; i++)
        {
            var cat = categories[i];
            var y = startY + i * rowHeight;
            using var labelPaint = new SKPaint { Color = SKColor.Parse("#334155"), TextSize = 12, IsAntialias = true };
            canvas.DrawText(ShortLabel(cat.Name), 12, y + 18, labelPaint);

            var scoreW = (float)((double)cat.Score / 4.0 * maxBarW);
            using var barPaint = new SKPaint { Color = SKColor.Parse("#0f766e"), IsAntialias = true };
            canvas.DrawRoundRect(new SKRect(130, y + 6, 130 + scoreW, y + 26), 4, 4, barPaint);

            if (benchMap.TryGetValue(cat.Code, out var mean) && mean.HasValue)
            {
                var benchX = 130 + (float)((double)mean.Value / 4.0 * maxBarW);
                using var linePaint = new SKPaint { Color = SKColor.Parse("#f59e0b"), StrokeWidth = 2, IsAntialias = true };
                canvas.DrawLine(benchX, y + 4, benchX, y + 28, linePaint);
            }

            using var scorePaint = new SKPaint { Color = SKColor.Parse("#0f172a"), TextSize = 12, IsAntialias = true, Typeface = SKTypeface.FromFamilyName("Arial", SKFontStyle.Bold) };
            canvas.DrawText($"{cat.Score:F1} ({cat.ScorePct:F0}%)", width - 88, y + 18, scorePaint);
        }

        using var image = surface.Snapshot();
        using var data = image.Encode(SKEncodedImageFormat.Png, 95);
        return data.ToArray();
    }

    private static byte[] RenderRadar(
        IReadOnlyList<string> labels,
        IReadOnlyList<RadarSeries> series,
        IReadOnlyList<decimal> rawScores,
        int width,
        int height,
        string title)
    {
        using var surface = SKSurface.Create(new SKImageInfo(width, height));
        var canvas = surface.Canvas;
        canvas.Clear(SKColors.White);

        var cx = width / 2f;
        var cy = height / 2f + 6f;
        var radius = Math.Min(width, height) * 0.30f;
        var count = labels.Count;

        using var titlePaint = new SKPaint
        {
            Color = SKColor.Parse("#0f172a"),
            TextSize = 17,
            IsAntialias = true,
            Typeface = SKTypeface.FromFamilyName("Arial", SKFontStyle.Bold),
        };
        canvas.DrawText(title, cx - titlePaint.MeasureText(title) / 2, 20, titlePaint);

        using var legendPaint = new SKPaint { Color = SKColor.Parse("#64748b"), TextSize = 11, IsAntialias = true };
        var legend = series.Count > 1
            ? "■ Doanh nghiệp   |   - - Ngưỡng tham chiếu"
            : "■ Doanh nghiệp (điểm trên thang 0–4)";
        canvas.DrawText(legend, cx - legendPaint.MeasureText(legend) / 2, 36, legendPaint);

        for (var ring = 1; ring <= 4; ring++)
        {
            var r = radius * ring / 4f;
            using var gridPaint = new SKPaint
            {
                Color = SKColor.Parse("#e2e8f0"),
                Style = SKPaintStyle.Stroke,
                StrokeWidth = 1,
                IsAntialias = true,
            };
            DrawPolygon(canvas, cx, cy, r, count, gridPaint);

            using var ringLabelPaint = new SKPaint { Color = SKColor.Parse("#94a3b8"), TextSize = 10, IsAntialias = true };
            var ringScore = ring.ToString();
            canvas.DrawText(ringScore, cx + 4, cy - r + 3, ringLabelPaint);
        }

        using (var axisPaint = new SKPaint { Color = SKColor.Parse("#cbd5e1"), StrokeWidth = 1, IsAntialias = true })
        {
            for (var i = 0; i < count; i++)
            {
                var pt = Polar(cx, cy, radius, i, count);
                canvas.DrawLine(cx, cy, pt.X, pt.Y, axisPaint);
            }
        }

        foreach (var s in series)
        {
            using var path = new SKPath();
            for (var i = 0; i < count; i++)
            {
                var val = i < s.Values.Count ? s.Values[i] : 0m;
                var pt = Polar(cx, cy, radius * (float)val, i, count);
                if (i == 0)
                    path.MoveTo(pt);
                else
                    path.LineTo(pt);
            }
            path.Close();

            using var fillPaint = new SKPaint
            {
                Color = s.Color.WithAlpha(40),
                Style = SKPaintStyle.Fill,
                IsAntialias = true,
            };
            using var strokePaint = new SKPaint
            {
                Color = s.Color,
                Style = SKPaintStyle.Stroke,
                StrokeWidth = 2,
                IsAntialias = true,
                PathEffect = s.Dashed ? SKPathEffect.CreateDash(new[] { 8f, 6f }, 0) : null,
            };
            canvas.DrawPath(path, fillPaint);
            canvas.DrawPath(path, strokePaint);
        }

        if (rawScores.Count == count && count > 0)
        {
            using var scorePaint = new SKPaint
            {
                Color = SKColor.Parse("#0f766e"),
                TextSize = 11,
                IsAntialias = true,
                Typeface = SKTypeface.FromFamilyName("Arial", SKFontStyle.Bold),
            };
            for (var i = 0; i < count; i++)
            {
                var val = i < series[0].Values.Count ? series[0].Values[i] : 0m;
                var pt = Polar(cx, cy, radius * (float)val + 14, i, count);
                var text = $"{rawScores[i]:F1}";
                var tw = scorePaint.MeasureText(text);
                canvas.DrawText(text, pt.X - tw / 2, pt.Y + 3, scorePaint);
            }
        }

        using var labelPaint = new SKPaint { Color = SKColor.Parse("#475569"), TextSize = 11, IsAntialias = true };
        for (var i = 0; i < count; i++)
        {
            var pt = Polar(cx, cy, radius + 28, i, count);
            var text = labels[i];
            var tw = labelPaint.MeasureText(text);
            canvas.DrawText(text, pt.X - tw / 2, pt.Y + 4, labelPaint);
        }

        using var image = surface.Snapshot();
        using var data = image.Encode(SKEncodedImageFormat.Png, 95);
        return data.ToArray();
    }

    private static void DrawPolygon(SKCanvas canvas, float cx, float cy, float r, int count, SKPaint paint)
    {
        using var path = new SKPath();
        for (var i = 0; i < count; i++)
        {
            var pt = Polar(cx, cy, r, i, count);
            if (i == 0)
                path.MoveTo(pt);
            else
                path.LineTo(pt);
        }
        path.Close();
        canvas.DrawPath(path, paint);
    }

    private static SKPoint Polar(float cx, float cy, float r, int index, int count)
    {
        var angle = -Math.PI / 2 + index * 2 * Math.PI / count;
        return new SKPoint(cx + r * (float)Math.Cos(angle), cy + r * (float)Math.Sin(angle));
    }

    private static string ShortLabel(string name)
    {
        if (name.Length <= 14)
            return name;
        return name[..12] + "…";
    }
}
