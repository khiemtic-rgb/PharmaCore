using System.Text.Json;
using Dapper;
using KitPlatform.Infrastructure.Data;
using KitPlatform.Packs.Survey;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal sealed class KapBenchmarkAggregateService
{
    private readonly IDbConnectionFactory _db;
    private readonly AssessmentSettings _settings;
    private readonly ILogger<KapBenchmarkAggregateService> _logger;

    public KapBenchmarkAggregateService(
        IDbConnectionFactory db,
        IOptions<AssessmentSettings> settings,
        ILogger<KapBenchmarkAggregateService> logger)
    {
        _db = db;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<int> RunAsync(CancellationToken cancellationToken = default)
    {
        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);

        const string templatesSql = """
            SELECT id AS Id, code AS Code
            FROM assessment_template
            WHERE status = 'active'
            """;

        var templates = (await conn.QueryAsync<TemplateRow>(templatesSql)).ToList();
        var updated = 0;

        foreach (var template in templates)
        {
            updated += await AggregateCohortAsync(conn, template.Id, "PHARMACY_VN_BASELINE", null, cancellationToken);

            foreach (var scale in new[] { "micro", "small", "medium", "large", "chain" })
            {
                updated += await AggregateCohortAsync(
                    conn,
                    template.Id,
                    $"PHARMACY_VN_SCALE_{scale.ToUpperInvariant()}",
                    scale,
                    cancellationToken);
            }
        }

        return updated;
    }

    private async Task<int> AggregateCohortAsync(
        System.Data.IDbConnection conn,
        Guid templateId,
        string cohortCode,
        string? orgScale,
        CancellationToken cancellationToken)
    {
        const string overallSql = """
            SELECT
                COUNT(*)::int AS SampleSize,
                AVG(s.overall_score)::numeric AS OverallMean,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.overall_score) AS OverallP50,
                PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY s.overall_score) AS OverallP90
            FROM assessment_submission s
            LEFT JOIN assessment_submission_context ctx ON ctx.submission_id = s.id
            WHERE s.template_id = @TemplateId
              AND s.status IN ('lead_captured', 'report_ready')
              AND s.overall_score IS NOT NULL
              AND (@OrgScale IS NULL OR ctx.org_scale = @OrgScale)
            """;

        var overall = await conn.QuerySingleAsync<OverallStatsRow>(
            new CommandDefinition(
                overallSql,
                new { TemplateId = templateId, OrgScale = orgScale },
                cancellationToken: cancellationToken));

        if (overall.SampleSize < _settings.BenchmarkAggregateMinSampleSize)
        {
            _logger.LogDebug(
                "Skip cohort {CohortCode}: sample {Sample} < min {Min}",
                cohortCode,
                overall.SampleSize,
                _settings.BenchmarkAggregateMinSampleSize);
            return 0;
        }

        const string categorySql = """
            SELECT
                c.code AS Code,
                AVG(cs.score)::numeric AS Mean,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cs.score) AS P50
            FROM assessment_category_score cs
            JOIN assessment_category c ON c.id = cs.category_id
            JOIN assessment_submission s ON s.id = cs.submission_id
            LEFT JOIN assessment_submission_context ctx ON ctx.submission_id = s.id
            WHERE s.template_id = @TemplateId
              AND s.status IN ('lead_captured', 'report_ready')
              AND (@OrgScale IS NULL OR ctx.org_scale = @OrgScale)
            GROUP BY c.code
            """;

        var categories = (await conn.QueryAsync<CategoryStatsRow>(
            new CommandDefinition(
                categorySql,
                new { TemplateId = templateId, OrgScale = orgScale },
                cancellationToken: cancellationToken))).ToList();

        var categoryDict = new Dictionary<string, object>();
        foreach (var cat in categories)
        {
            categoryDict[cat.Code] = new { mean = cat.Mean, p50 = cat.P50 };
        }

        var stats = new
        {
            overall = new
            {
                mean = overall.OverallMean,
                p50 = overall.OverallP50,
                p90 = overall.OverallP90,
            },
            categories = categoryDict,
            note = orgScale is null
                ? "Aggregated from anonymized KAP submissions (all scales)."
                : $"Aggregated for org_scale={orgScale}.",
        };

        var statsJson = JsonSerializer.Serialize(stats);

        const string upsertSql = """
            INSERT INTO assessment_benchmark_cohort (
                template_id, cohort_code, vertical_code, org_scale, sample_size, stats_json, computed_at, is_active
            )
            VALUES (
                @TemplateId, @CohortCode, 'pharmacy', @OrgScale, @SampleSize, @StatsJson::jsonb, NOW(), TRUE
            )
            ON CONFLICT (template_id, cohort_code) DO UPDATE SET
                org_scale = EXCLUDED.org_scale,
                sample_size = EXCLUDED.sample_size,
                stats_json = EXCLUDED.stats_json,
                computed_at = NOW(),
                is_active = TRUE
            """;

        await conn.ExecuteAsync(
            new CommandDefinition(
                upsertSql,
                new
                {
                    TemplateId = templateId,
                    CohortCode = cohortCode,
                    OrgScale = orgScale,
                    SampleSize = overall.SampleSize,
                    StatsJson = statsJson,
                },
                cancellationToken: cancellationToken));

        _logger.LogInformation(
            "Updated benchmark cohort {CohortCode}: n={SampleSize}, mean={Mean:F2}",
            cohortCode,
            overall.SampleSize,
            overall.OverallMean);

        return 1;
    }

    private sealed class TemplateRow
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = "";
    }

    private sealed class OverallStatsRow
    {
        public int SampleSize { get; set; }
        public decimal OverallMean { get; set; }
        public decimal OverallP50 { get; set; }
        public decimal OverallP90 { get; set; }
    }

    private sealed class CategoryStatsRow
    {
        public string Code { get; set; } = "";
        public decimal Mean { get; set; }
        public decimal P50 { get; set; }
    }
}
