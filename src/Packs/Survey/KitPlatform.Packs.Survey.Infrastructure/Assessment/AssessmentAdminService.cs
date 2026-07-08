using Microsoft.Extensions.Options;
using KitPlatform.Packs.Survey;
using KitPlatform.Application.Configuration;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal sealed class AssessmentAdminService : IAssessmentAdminService
{
    private readonly AssessmentRepository _repo;
    private readonly PlatformSettings _platform;

    public AssessmentAdminService(AssessmentRepository repo, IOptions<PlatformSettings> platform)
    {
        _repo = repo;
        _platform = platform.Value;
    }

    public AssessmentAdminAccessDto GetAccess() =>
        new(_platform.EnableAssessmentLeadsAdmin);

    public async Task<AssessmentSubmissionListResultDto> ListSubmissionsAsync(
        AssessmentSubmissionListQuery query,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();

        var (items, total) = await _repo.ListSubmissionsAsync(
            query.Page,
            query.PageSize,
            query.Status,
            query.HasLead,
            cancellationToken);

        return new AssessmentSubmissionListResultDto(
            items.Select(MapListItem).ToList(),
            total,
            Math.Max(1, query.Page),
            Math.Clamp(query.PageSize, 1, 100));
    }

    public async Task<AssessmentSubmissionDetailAdminDto?> GetSubmissionAsync(
        Guid submissionId,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();

        var submission = await _repo.GetSubmissionAsync(submissionId, cancellationToken);
        if (submission is null)
            return null;

        var counts = await _repo.GetRequiredCountsAsync(submissionId, cancellationToken);
        var responses = await _repo.GetResponsesAsync(submissionId, cancellationToken);
        var categoryScores = await _repo.GetCategoryScoresAsync(submissionId, cancellationToken);
        var insights = await _repo.GetInsightsAsync(submissionId, cancellationToken);
        var recommendations = await _repo.GetRecommendationsAsync(submissionId, cancellationToken);
        var scoringRows = await _repo.GetScoringDataAsync(submissionId, cancellationToken);
        var qualitative = AssessmentScoringEngine.Compute(scoringRows).Qualitative;

        return new AssessmentSubmissionDetailAdminDto(
            submission.Id,
            submission.Status,
            submission.TemplateCode,
            submission.TemplateVersion,
            submission.StartedAt,
            submission.CompletedAt,
            submission.LeadCapturedAt,
            submission.OverallScore,
            submission.OverallPct,
            submission.RespondentName,
            submission.RespondentPhone,
            submission.RespondentEmail,
            submission.RespondentOrgName,
            submission.RespondentNote,
            submission.ConsentMarketing,
            categoryScores.Select(c => new AssessmentCategoryScoreDto(c.Code, c.Name, c.Score, c.ScorePct)).ToList(),
            insights.Select(i => new AssessmentInsightDto(i.Title, i.Body, i.Severity)).ToList(),
            recommendations.Select(r => new AssessmentRecommendationDto(
                r.Title, r.Body, r.Priority, r.ProductArea, r.EstimateHint)).ToList(),
            new AssessmentQualitativeTagsDto(qualitative.PainPointTag, qualitative.PriorityNeedTag),
            responses.Count,
            counts.TotalRequired);
    }

    private static AssessmentSubmissionListItemDto MapListItem(AssessmentSubmissionListRow row) =>
        new(
            row.Id,
            row.Status,
            row.TemplateCode,
            row.TemplateVersion,
            row.StartedAt,
            row.CompletedAt,
            row.LeadCapturedAt,
            row.OverallScore,
            row.OverallPct,
            row.ResponseCount,
            row.RespondentName,
            row.RespondentPhone,
            row.RespondentEmail,
            row.RespondentOrgName);

    private void EnsureEnabled()
    {
        if (!_platform.EnableAssessmentLeadsAdmin)
            throw new UnauthorizedAccessException("Tính năng không khả dụng trên triển khai này.");
    }
}
