using System.Data;
using System.Text.Json;
using Dapper;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal sealed class AssessmentIntelligenceRepository
{
    private readonly IDbConnectionFactory _db;

    public AssessmentIntelligenceRepository(IDbConnectionFactory db) => _db = db;

    public async Task<IReadOnlyList<AssessmentMaturityLevelRow>> GetMaturityLevelsAsync(
        Guid templateId,
        string? verticalCode,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT level AS Level, code AS Code, name AS Name, description AS Description,
                   score_min AS ScoreMin, score_max AS ScoreMax
            FROM assessment_maturity_level
            WHERE template_id = @TemplateId
              AND is_active = TRUE
              AND (vertical_code IS NULL OR vertical_code = @VerticalCode)
            ORDER BY sort_order, level
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<AssessmentMaturityLevelRow>(sql, new
        {
            TemplateId = templateId,
            VerticalCode = verticalCode,
        });
        return rows.ToList();
    }

    public async Task<IReadOnlyList<AssessmentRootCauseKbRow>> GetRootCauseKbAsync(
        Guid templateId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT question_code AS QuestionCode, category_code AS CategoryCode,
                   trigger_expression AS TriggerExpression, cause_code AS CauseCode,
                   cause_title AS CauseTitle, cause_body AS CauseBody,
                   evidence_hint AS EvidenceHint, sort_order AS SortOrder
            FROM assessment_root_cause_kb
            WHERE template_id = @TemplateId AND is_active = TRUE
            ORDER BY sort_order, cause_code
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        var rows = await conn.QueryAsync<AssessmentRootCauseKbRow>(sql, new { TemplateId = templateId });
        return rows.ToList();
    }

    public async Task<AssessmentBenchmarkCohortRow?> GetBenchmarkCohortAsync(
        Guid templateId,
        string cohortCode,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT cohort_code AS CohortCode, sample_size AS SampleSize, stats_json::text AS StatsJson
            FROM assessment_benchmark_cohort
            WHERE template_id = @TemplateId AND cohort_code = @CohortCode AND is_active = TRUE
            LIMIT 1
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<AssessmentBenchmarkCohortRow>(sql, new
        {
            TemplateId = templateId,
            CohortCode = cohortCode,
        });
    }

    public async Task<Guid?> FindPriorSubmissionIdAsync(
        string phone,
        Guid templateId,
        Guid currentSubmissionId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id
            FROM assessment_submission
            WHERE respondent_phone = @Phone
              AND template_id = @TemplateId
              AND id <> @CurrentSubmissionId
              AND status IN ('completed', 'lead_captured', 'report_ready')
              AND completed_at IS NOT NULL
            ORDER BY completed_at DESC
            LIMIT 1
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<Guid?>(sql, new
        {
            Phone = phone,
            TemplateId = templateId,
            CurrentSubmissionId = currentSubmissionId,
        });
    }

    public async Task<AssessmentReportArtifactRow?> GetCurrentArtifactAsync(
        Guid submissionId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id AS Id, schema_version AS SchemaVersion, artifact_json::text AS ArtifactJson,
                   pipeline_version AS PipelineVersion, engine_mode AS EngineMode,
                   phases_completed AS PhasesCompleted
            FROM assessment_report_artifact
            WHERE submission_id = @SubmissionId AND is_current = TRUE
            LIMIT 1
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<AssessmentReportArtifactRow>(sql, new { SubmissionId = submissionId });
    }

    public async Task<Guid> SaveArtifactAsync(
        IDbConnection conn,
        IDbTransaction tx,
        Guid submissionId,
        string artifactJson,
        string pipelineVersion,
        string engineMode,
        IReadOnlyList<string> phasesCompleted,
        CancellationToken cancellationToken)
    {
        await conn.ExecuteAsync(
            """
            UPDATE assessment_report_artifact
            SET is_current = FALSE
            WHERE submission_id = @SubmissionId AND is_current = TRUE
            """,
            new { SubmissionId = submissionId },
            tx);

        var id = Guid.NewGuid();
        await conn.ExecuteAsync(
            """
            INSERT INTO assessment_report_artifact (
                id, submission_id, schema_version, artifact_json,
                pipeline_version, engine_mode, phases_completed, is_current
            )
            VALUES (
                @Id, @SubmissionId, @SchemaVersion, @ArtifactJson::jsonb,
                @PipelineVersion, @EngineMode, @PhasesCompleted, TRUE
            )
            """,
            new
            {
                Id = id,
                SubmissionId = submissionId,
                SchemaVersion = KapReportArtifactSchema.Version,
                ArtifactJson = artifactJson,
                PipelineVersion = pipelineVersion,
                EngineMode = engineMode,
                PhasesCompleted = phasesCompleted.ToArray(),
            },
            tx);

        await conn.ExecuteAsync(
            """
            UPDATE assessment_submission
            SET status = 'report_ready', report_ready_at = NOW()
            WHERE id = @SubmissionId
            """,
            new { SubmissionId = submissionId },
            tx);

        return id;
    }

    public async Task<Guid> StartAnalysisRunAsync(
        IDbConnection conn,
        IDbTransaction tx,
        Guid submissionId,
        string triggerEvent,
        int pipelineLevel,
        IReadOnlyList<string> phasesRequested)
    {
        var id = Guid.NewGuid();
        await conn.ExecuteAsync(
            """
            INSERT INTO assessment_analysis_run (
                id, submission_id, trigger_event, status, pipeline_level, phases_requested
            )
            VALUES (@Id, @SubmissionId, @TriggerEvent, 'running', @PipelineLevel, @PhasesRequested)
            """,
            new
            {
                Id = id,
                SubmissionId = submissionId,
                TriggerEvent = triggerEvent,
                PipelineLevel = pipelineLevel,
                PhasesRequested = phasesRequested.ToArray(),
            },
            tx);
        return id;
    }

    public async Task CompleteAnalysisRunAsync(
        IDbConnection conn,
        IDbTransaction tx,
        Guid runId,
        Guid artifactId,
        IReadOnlyList<string> phasesSucceeded,
        string status)
    {
        await conn.ExecuteAsync(
            """
            UPDATE assessment_analysis_run
            SET artifact_id = @ArtifactId,
                status = @Status,
                phases_succeeded = @PhasesSucceeded,
                completed_at = NOW()
            WHERE id = @RunId
            """,
            new
            {
                RunId = runId,
                ArtifactId = artifactId,
                Status = status,
                PhasesSucceeded = phasesSucceeded.ToArray(),
            },
            tx);
    }

    public async Task FailAnalysisRunAsync(
        IDbConnection conn,
        IDbTransaction tx,
        Guid runId,
        string errorMessage)
    {
        await conn.ExecuteAsync(
            """
            UPDATE assessment_analysis_run
            SET status = 'failed', error_message = @Error, completed_at = NOW()
            WHERE id = @RunId
            """,
            new { RunId = runId, Error = errorMessage },
            tx);
    }

    public async Task UpsertSubmissionContextAsync(
        IDbConnection conn,
        IDbTransaction tx,
        Guid submissionId,
        string? verticalCode,
        Guid? priorSubmissionId,
        string? orgScale = null)
    {
        await conn.ExecuteAsync(
            """
            INSERT INTO assessment_submission_context (submission_id, vertical_code, prior_submission_id, org_scale)
            VALUES (@SubmissionId, @VerticalCode, @PriorSubmissionId, @OrgScale)
            ON CONFLICT (submission_id) DO UPDATE SET
                vertical_code = COALESCE(EXCLUDED.vertical_code, assessment_submission_context.vertical_code),
                prior_submission_id = COALESCE(EXCLUDED.prior_submission_id, assessment_submission_context.prior_submission_id),
                org_scale = COALESCE(EXCLUDED.org_scale, assessment_submission_context.org_scale),
                updated_at = NOW()
            """,
            new
            {
                SubmissionId = submissionId,
                VerticalCode = verticalCode,
                PriorSubmissionId = priorSubmissionId,
                OrgScale = orgScale,
            },
            tx);
    }

    public async Task<string?> GetSubmissionOrgScaleAsync(
        Guid submissionId,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT org_scale FROM assessment_submission_context
            WHERE submission_id = @SubmissionId
            LIMIT 1
            """;

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        return await conn.QuerySingleOrDefaultAsync<string?>(sql, new { SubmissionId = submissionId });
    }

    public async Task<AssessmentBenchmarkCohortRow?> GetBenchmarkCohortByScaleAsync(
        Guid templateId,
        string? orgScale,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(orgScale))
        {
            var scaled = await GetBenchmarkCohortAsync(
                templateId,
                $"PHARMACY_VN_SCALE_{orgScale.ToUpperInvariant()}",
                cancellationToken);
            if (scaled is not null && scaled.SampleSize > 0)
                return scaled;
        }

        return await GetBenchmarkCohortAsync(templateId, "PHARMACY_VN_BASELINE", cancellationToken);
    }
}

internal sealed class AssessmentMaturityLevelRow
{
    public short Level { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public decimal ScoreMin { get; set; }
    public decimal ScoreMax { get; set; }
}

internal sealed class AssessmentRootCauseKbRow
{
    public string? QuestionCode { get; set; }
    public string? CategoryCode { get; set; }
    public string TriggerExpression { get; set; } = "";
    public string CauseCode { get; set; } = "";
    public string CauseTitle { get; set; } = "";
    public string CauseBody { get; set; } = "";
    public string? EvidenceHint { get; set; }
    public int SortOrder { get; set; }
}

internal sealed class AssessmentBenchmarkCohortRow
{
    public string CohortCode { get; set; } = "";
    public int SampleSize { get; set; }
    public string StatsJson { get; set; } = "{}";
}

internal sealed class AssessmentReportArtifactRow
{
    public Guid Id { get; set; }
    public string SchemaVersion { get; set; } = "";
    public string ArtifactJson { get; set; } = "{}";
    public string PipelineVersion { get; set; } = "";
    public string EngineMode { get; set; } = "";
    public string[] PhasesCompleted { get; set; } = [];
}
