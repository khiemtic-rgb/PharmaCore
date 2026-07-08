using System.Text;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using KitPlatform.Packs.Survey;
using KitPlatform.Application.Platform.Events;
using KitPlatform.Infrastructure.Data;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal sealed class AssessmentSubmissionService : IAssessmentSubmissionService
{
    private static readonly Regex VnPhoneRegex = new(@"^0[0-9]{9}$", RegexOptions.Compiled);

    private readonly AssessmentRepository _repo;
    private readonly IDbConnectionFactory _db;
    private readonly AssessmentSettings _settings;

    public AssessmentSubmissionService(
        AssessmentRepository repo,
        IDbConnectionFactory db,
        IOptions<AssessmentSettings> settings)
    {
        _repo = repo;
        _db = db;
        _settings = settings.Value;
    }

    public async Task<CreateAssessmentSubmissionResult> CreateAsync(
        CreateAssessmentSubmissionRequest request,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        var template = await _repo.GetTemplateHeaderAsync(
            request.TemplateCode,
            request.TemplateVersion,
            cancellationToken)
            ?? throw new AssessmentException(
                AssessmentErrorCodes.NotFound,
                "Không tìm thấy template khảo sát.",
                statusCode: 404);

        var source = string.IsNullOrWhiteSpace(request.Source) ? "public_web" : request.Source.Trim();
        if (source is not ("public_web" or "admin" or "embed" or "sales"))
        {
            throw new AssessmentException(
                AssessmentErrorCodes.ValidationError,
                "source không hợp lệ.",
                statusCode: 400);
        }

        var sessionToken = AssessmentRepository.GenerateSessionToken();
        var id = await _repo.InsertSubmissionAsync(
            template.Id,
            template.Version,
            sessionToken,
            source,
            ipAddress,
            userAgent,
            request.Locale,
            cancellationToken);

        var expiresAt = DateTimeOffset.UtcNow.AddDays(_settings.SessionMaxAgeDays);

        return new CreateAssessmentSubmissionResult(
            id,
            sessionToken,
            "draft",
            template.Code,
            template.Version,
            expiresAt);
    }

    public async Task<AssessmentSubmissionDetailDto> GetAsync(
        Guid submissionId,
        string sessionToken,
        CancellationToken cancellationToken = default)
    {
        var submission = await RequireSubmissionAsync(submissionId, sessionToken, cancellationToken);
        var responses = await _repo.GetResponsesAsync(submissionId, cancellationToken);

        var map = responses.ToDictionary(
            r => r.QuestionId.ToString(),
            r => new AssessmentResponseItemDto(r.OptionId, r.TextValue));

        if (submission.Status is "completed" or "lead_captured" or "report_ready")
        {
            var categoryScores = await _repo.GetCategoryScoresAsync(submissionId, cancellationToken);
            var insights = await _repo.GetInsightsAsync(submissionId, cancellationToken);

            return new AssessmentSubmissionDetailDto(
                submission.Id,
                submission.Status,
                submission.TemplateCode,
                submission.TemplateVersion,
                submission.StartedAt,
                submission.CompletedAt,
                map,
                submission.OverallScore,
                submission.OverallPct,
                categoryScores.Select(c => new AssessmentCategoryScoreDto(c.Code, c.Name, c.Score, c.ScorePct)).ToList(),
                insights.Take(2).Select(i => new AssessmentInsightDto(i.Title, i.Body, i.Severity)).ToList());
        }

        return new AssessmentSubmissionDetailDto(
            submission.Id,
            submission.Status,
            submission.TemplateCode,
            submission.TemplateVersion,
            submission.StartedAt,
            submission.CompletedAt,
            map);
    }

    public async Task<SaveAssessmentResponsesResult> SaveResponsesAsync(
        Guid submissionId,
        string sessionToken,
        SaveAssessmentResponsesRequest request,
        CancellationToken cancellationToken = default)
    {
        var submission = await RequireSubmissionAsync(submissionId, sessionToken, cancellationToken);
        EnsureDraft(submission);

        if (request.Responses.Count == 0)
        {
            var countsEmpty = await _repo.GetRequiredCountsAsync(submissionId, cancellationToken);
            return new SaveAssessmentResponsesResult(0, countsEmpty.AnsweredRequired, countsEmpty.TotalRequired);
        }

        var validationRows = await _repo.GetQuestionsForValidationAsync(submissionId, cancellationToken);
        var optionToQuestion = validationRows
            .Where(r => r.OptionId.HasValue)
            .ToDictionary(r => r.OptionId!.Value, r => r.OptionQuestionId ?? r.QuestionId);

        var upserts = new List<AssessmentResponseUpsert>();
        foreach (var item in request.Responses)
        {
            if (item.OptionId.HasValue)
            {
                if (!optionToQuestion.TryGetValue(item.OptionId.Value, out var ownerQuestionId)
                    || ownerQuestionId != item.QuestionId)
                {
                    throw new AssessmentException(
                        AssessmentErrorCodes.ValidationError,
                        "optionId không thuộc questionId.",
                        statusCode: 400);
                }
            }

            upserts.Add(new AssessmentResponseUpsert(item.QuestionId, item.OptionId, item.TextValue));
        }

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);
        await _repo.UpsertResponsesAsync(conn, tx, submissionId, upserts);
        await tx.CommitAsync(cancellationToken);

        var counts = await _repo.GetRequiredCountsAsync(submissionId, cancellationToken);
        return new SaveAssessmentResponsesResult(
            upserts.Count,
            counts.AnsweredRequired,
            counts.TotalRequired);
    }

    public async Task<CompleteAssessmentResult> CompleteAsync(
        Guid submissionId,
        string sessionToken,
        CancellationToken cancellationToken = default)
    {
        var submission = await RequireSubmissionAsync(submissionId, sessionToken, cancellationToken);

        if (submission.Status != "draft")
        {
            throw new AssessmentException(
                AssessmentErrorCodes.AlreadyCompleted,
                "Submission đã hoàn thành.",
                statusCode: 409);
        }

        var counts = await _repo.GetRequiredCountsAsync(submissionId, cancellationToken);
        if (counts.AnsweredRequired < counts.TotalRequired)
        {
            throw new AssessmentException(
                AssessmentErrorCodes.ValidationError,
                $"Còn {counts.TotalRequired - counts.AnsweredRequired} câu bắt buộc chưa trả lời.",
                statusCode: 400);
        }

        var scoringRows = await _repo.GetScoringDataAsync(submissionId, cancellationToken);
        var scoring = AssessmentScoringEngine.Compute(scoringRows);
        var rules = await _repo.GetActiveRulesAsync(submission.TemplateId, cancellationToken);
        var responseCodes = scoringRows
            .Where(r => !string.IsNullOrWhiteSpace(r.OptionCode))
            .GroupBy(r => r.QuestionCode)
            .ToDictionary(g => g.Key, g => g.First().OptionCode!);

        var matches = AssessmentRuleEngine.Evaluate(
            rules,
            scoring.OverallScore,
            scoring.CategoryScoreByCode,
            scoring.DimensionScoreByCode,
            responseCodes);

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        await _repo.SaveScoresAsync(
            conn,
            tx,
            submissionId,
            scoring.OverallScore,
            scoring.OverallPct,
            scoring.DimensionScores,
            scoring.CategoryScores);

        await _repo.DeleteInsightsAndRecommendationsAsync(conn, tx, submissionId);

        var insightMatches = matches
            .Where(m => string.Equals(m.Rule.ActionType, "insight", StringComparison.OrdinalIgnoreCase))
            .Take(2)
            .ToList();

        var sort = 0;
        foreach (var match in insightMatches)
        {
            await PersistInsightAsync(_repo, conn, tx, submissionId, match, sort++);
        }

        await TryWriteCompletedEventAsync(conn, tx, submissionId, scoring.OverallScore, scoring.OverallPct, cancellationToken);

        await tx.CommitAsync(cancellationToken);

        var categoryScores = await _repo.GetCategoryScoresAsync(submissionId, cancellationToken);
        var insights = await _repo.GetInsightsAsync(submissionId, cancellationToken);

        return new CompleteAssessmentResult(
            "completed",
            scoring.OverallScore,
            scoring.OverallPct,
            categoryScores.Select(c => new AssessmentCategoryScoreDto(c.Code, c.Name, c.Score, c.ScorePct)).ToList(),
            insights.Select(i => new AssessmentInsightDto(i.Title, i.Body, i.Severity)).ToList(),
            ReportLocked: true,
            LeadCaptureRequired: true);
    }

    public async Task<CaptureAssessmentLeadResult> CaptureLeadAsync(
        Guid submissionId,
        string sessionToken,
        CaptureAssessmentLeadRequest request,
        CancellationToken cancellationToken = default)
    {
        var submission = await RequireSubmissionAsync(submissionId, sessionToken, cancellationToken);

        if (submission.Status != "completed")
        {
            throw new AssessmentException(
                AssessmentErrorCodes.ValidationError,
                submission.Status == "draft"
                    ? "Hoàn thành khảo sát trước khi gửi thông tin."
                    : "Lead đã được ghi nhận.",
                statusCode: 400);
        }

        ValidateLeadRequest(request);

        var scoringRows = await _repo.GetScoringDataAsync(submissionId, cancellationToken);
        var scoring = AssessmentScoringEngine.Compute(scoringRows);
        var rules = await _repo.GetActiveRulesAsync(submission.TemplateId, cancellationToken);
        var responseCodes = scoringRows
            .Where(r => !string.IsNullOrWhiteSpace(r.OptionCode))
            .GroupBy(r => r.QuestionCode)
            .ToDictionary(g => g.Key, g => g.First().OptionCode!);

        var matches = AssessmentRuleEngine.Evaluate(
            rules,
            scoring.OverallScore,
            scoring.CategoryScoreByCode,
            scoring.DimensionScoreByCode,
            responseCodes);

        var phone = NormalizePhone(request.RespondentPhone);

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        await _repo.CaptureLeadAsync(
            conn,
            tx,
            submissionId,
            request.RespondentName.Trim(),
            phone,
            request.RespondentEmail.Trim(),
            request.RespondentOrgName.Trim(),
            request.RespondentNote?.Trim(),
            request.ConsentMarketing);

        await _repo.DeleteInsightsAndRecommendationsAsync(conn, tx, submissionId);

        var insightSort = 0;
        var recSort = 0;
        foreach (var match in matches)
        {
            if (string.Equals(match.Rule.ActionType, "insight", StringComparison.OrdinalIgnoreCase))
                await PersistInsightAsync(_repo, conn, tx, submissionId, match, insightSort++);
            else if (string.Equals(match.Rule.ActionType, "recommendation", StringComparison.OrdinalIgnoreCase))
                await PersistRecommendationAsync(conn, tx, submissionId, match, recSort++);
        }

        await TryWriteLeadCapturedEventAsync(conn, tx, submissionId, phone, cancellationToken);

        await tx.CommitAsync(cancellationToken);

        return new CaptureAssessmentLeadResult(
            "lead_captured",
            sessionToken,
            "Cảm ơn. Báo cáo đã sẵn sàng.");
    }

    public async Task<AssessmentFullReportDto> GetReportAsync(
        Guid submissionId,
        string sessionToken,
        CancellationToken cancellationToken = default)
    {
        var submission = await RequireSubmissionAsync(submissionId, sessionToken, cancellationToken);
        EnsureReportUnlocked(submission);

        return await BuildFullReportAsync(submission, cancellationToken);
    }

    public async Task<(byte[] Content, string FileName, string ContentType)> GetReportPdfAsync(
        Guid submissionId,
        string sessionToken,
        CancellationToken cancellationToken = default)
    {
        var submission = await RequireSubmissionAsync(submissionId, sessionToken, cancellationToken);
        EnsureReportUnlocked(submission);

        var report = await BuildFullReportAsync(submission, cancellationToken);
        var orgName = submission.Id.ToString();

        var existing = await _repo.GetLatestReportAsync(submissionId, cancellationToken);
        if (existing is not null && File.Exists(existing.StorageKey))
        {
            var bytes = await File.ReadAllBytesAsync(existing.StorageKey, cancellationToken);
            return (bytes, existing.FileName, "text/html; charset=utf-8");
        }

        var content = AssessmentReportHtmlGenerator.Generate(report, orgName);
        var reportsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "assessment-reports");
        Directory.CreateDirectory(reportsDir);
        var fileName = $"assessment-{submissionId:N}.html";
        var filePath = Path.Combine(reportsDir, fileName);
        await File.WriteAllBytesAsync(filePath, content, cancellationToken);

        await using var conn = await _db.CreateOpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);
        await _repo.UpsertReportAsync(conn, tx, submissionId, filePath, fileName, content.LongLength, "html");
        await tx.CommitAsync(cancellationToken);

        return (content, fileName, "text/html; charset=utf-8");
    }

    private async Task<AssessmentFullReportDto> BuildFullReportAsync(
        AssessmentSubmissionRow submission,
        CancellationToken cancellationToken)
    {
        var categoryScores = await _repo.GetCategoryScoresAsync(submission.Id, cancellationToken);
        var dimensionScores = await _repo.GetDimensionScoresAsync(submission.Id, cancellationToken);
        var insights = await _repo.GetInsightsAsync(submission.Id, cancellationToken);
        var recommendations = await _repo.GetRecommendationsAsync(submission.Id, cancellationToken);
        var scoringRows = await _repo.GetScoringDataAsync(submission.Id, cancellationToken);
        var qualitative = AssessmentScoringEngine.Compute(scoringRows).Qualitative;

        return new AssessmentFullReportDto(
            submission.Id,
            submission.TemplateCode,
            submission.CompletedAt,
            submission.OverallScore ?? 0m,
            submission.OverallPct ?? 0m,
            categoryScores.Select(c => new AssessmentCategoryScoreDto(c.Code, c.Name, c.Score, c.ScorePct)).ToList(),
            dimensionScores.Select(d => new AssessmentDimensionScoreDto(
                d.Code, d.Name, d.CategoryCode, d.Score, d.ScorePct)).ToList(),
            insights.Select(i => new AssessmentInsightDto(i.Title, i.Body, i.Severity)).ToList(),
            recommendations.Select(r => new AssessmentRecommendationDto(
                r.Title, r.Body, r.Priority, r.ProductArea, r.EstimateHint)).ToList(),
            new AssessmentQualitativeTagsDto(qualitative.PainPointTag, qualitative.PriorityNeedTag),
            new AssessmentReportPdfDto(
                true,
                $"/api/public/assessment/submissions/{submission.Id}/report.pdf"));
    }

    private async Task<AssessmentSubmissionRow> RequireSubmissionAsync(
        Guid submissionId,
        string sessionToken,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(sessionToken))
        {
            throw new AssessmentException(
                AssessmentErrorCodes.SessionInvalid,
                "Thiếu session token.",
                statusCode: 401);
        }

        var submission = await _repo.GetSubmissionAsync(submissionId, cancellationToken);
        if (submission is null)
        {
            throw new AssessmentException(
                AssessmentErrorCodes.NotFound,
                "Không tìm thấy submission.",
                statusCode: 404);
        }

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(submission.SessionToken),
                Encoding.UTF8.GetBytes(sessionToken)))
        {
            throw new AssessmentException(
                AssessmentErrorCodes.SessionInvalid,
                "Session không hợp lệ.",
                statusCode: 401);
        }

        return submission;
    }

    private static void EnsureDraft(AssessmentSubmissionRow submission)
    {
        if (submission.Status != "draft")
        {
            throw new AssessmentException(
                AssessmentErrorCodes.AlreadyCompleted,
                "Không thể sửa submission đã hoàn thành.",
                statusCode: 409);
        }
    }

    private static void EnsureReportUnlocked(AssessmentSubmissionRow submission)
    {
        if (submission.Status is "draft" or "completed")
        {
            throw new AssessmentException(
                AssessmentErrorCodes.ReportLocked,
                "Báo cáo bị khóa. Vui lòng nhập thông tin liên hệ.",
                statusCode: 403);
        }
    }

    private static void ValidateLeadRequest(CaptureAssessmentLeadRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RespondentName) || request.RespondentName.Trim().Length < 2)
        {
            throw new AssessmentException(
                AssessmentErrorCodes.ValidationError,
                "respondentName bắt buộc (tối thiểu 2 ký tự).",
                statusCode: 400);
        }

        if (string.IsNullOrWhiteSpace(request.RespondentOrgName) || request.RespondentOrgName.Trim().Length < 2)
        {
            throw new AssessmentException(
                AssessmentErrorCodes.ValidationError,
                "respondentOrgName bắt buộc (tối thiểu 2 ký tự).",
                statusCode: 400);
        }

        var phone = NormalizePhone(request.RespondentPhone);
        if (!VnPhoneRegex.IsMatch(phone))
        {
            throw new AssessmentException(
                AssessmentErrorCodes.ValidationError,
                "respondentPhone không hợp lệ (10 số, bắt đầu 0).",
                statusCode: 400);
        }

        if (string.IsNullOrWhiteSpace(request.RespondentEmail)
            || !request.RespondentEmail.Contains('@')
            || request.RespondentEmail.Length < 5)
        {
            throw new AssessmentException(
                AssessmentErrorCodes.ValidationError,
                "respondentEmail không hợp lệ.",
                statusCode: 400);
        }
    }

    private static string NormalizePhone(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("84") && digits.Length == 11)
            digits = "0" + digits[2..];
        return digits;
    }

    private static async Task PersistInsightAsync(
        AssessmentRepository repo,
        System.Data.IDbConnection conn,
        System.Data.IDbTransaction tx,
        Guid submissionId,
        AssessmentRuleEngine.Match match,
        int sortOrder)
    {
        var root = match.Payload.RootElement;
        var title = root.GetProperty("title").GetString() ?? match.Rule.Code;
        var body = root.GetProperty("body").GetString() ?? "";
        var severity = root.TryGetProperty("severity", out var sev) ? sev.GetString() ?? "info" : "info";
        var scopeType = root.TryGetProperty("scopeType", out var st) ? st.GetString() : null;
        var scopeCode = root.TryGetProperty("scopeCode", out var sc) ? sc.GetString() : null;

        await repo.InsertInsightAsync(
            conn, tx, submissionId, match.Rule.Id, title, body, severity, scopeType, scopeCode, sortOrder);
    }

    private async Task PersistRecommendationAsync(
        System.Data.IDbConnection conn,
        System.Data.IDbTransaction tx,
        Guid submissionId,
        AssessmentRuleEngine.Match match,
        int sortOrder)
    {
        var root = match.Payload.RootElement;
        var title = root.GetProperty("title").GetString() ?? match.Rule.Code;
        var body = root.GetProperty("body").GetString() ?? "";
        var priority = root.TryGetProperty("priority", out var p) && p.TryGetInt32(out var pv)
            ? pv
            : match.Rule.Priority;
        var productArea = root.TryGetProperty("productArea", out var pa) ? pa.GetString() : null;
        var estimateHint = root.TryGetProperty("estimateHint", out var eh) ? eh.GetString() : null;

        await _repo.InsertRecommendationAsync(
            conn, tx, submissionId, match.Rule.Id, title, body, priority, productArea, estimateHint, sortOrder);
    }

    private async Task TryWriteLeadCapturedEventAsync(
        System.Data.IDbConnection conn,
        System.Data.IDbTransaction tx,
        Guid submissionId,
        string phone,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_settings.EventTenantCode))
            return;

        var tenantId = await _repo.GetTenantIdByCodeAsync(_settings.EventTenantCode, cancellationToken);
        if (tenantId is null)
            return;

        var phoneHash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(phone))).ToLowerInvariant();

        await _repo.WritePlatformEventAsync(
            conn,
            tx,
            tenantId.Value,
            PlatformEventTypes.AssessmentSubmissionLeadCaptured,
            submissionId,
            new { submissionId, phoneHash },
            cancellationToken);
    }

    private async Task TryWriteCompletedEventAsync(
        System.Data.IDbConnection conn,
        System.Data.IDbTransaction tx,
        Guid submissionId,
        decimal overallScore,
        decimal overallPct,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_settings.EventTenantCode))
            return;

        var tenantId = await _repo.GetTenantIdByCodeAsync(_settings.EventTenantCode, cancellationToken);
        if (tenantId is null)
            return;

        await _repo.WritePlatformEventAsync(
            conn,
            tx,
            tenantId.Value,
            PlatformEventTypes.AssessmentSubmissionCompleted,
            submissionId,
            new { submissionId, overallScore, overallPct },
            cancellationToken);
    }
}
