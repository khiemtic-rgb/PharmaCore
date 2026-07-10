using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using KitPlatform.Application.Platform.Events;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Packs.Survey.Infrastructure.Events;

/// <summary>Đồng bộ lead KAP vào CRM khi platform event lead_captured được dispatch.</summary>
internal sealed class AssessmentLeadCapturedHandler : IPlatformEventHandler
{
    private readonly AssessmentRepository _repo;
    private readonly AssessmentSettings _settings;
    private readonly ILogger<AssessmentLeadCapturedHandler> _logger;

    public AssessmentLeadCapturedHandler(
        AssessmentRepository repo,
        IOptions<AssessmentSettings> settings,
        ILogger<AssessmentLeadCapturedHandler> logger)
    {
        _repo = repo;
        _settings = settings.Value;
        _logger = logger;
    }

    public IReadOnlySet<string> EventTypes { get; } =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase) { PlatformEventTypes.AssessmentSubmissionLeadCaptured };

    public async Task HandleAsync(PlatformEventEnvelope envelope, CancellationToken cancellationToken = default)
    {
        if (!_settings.SyncLeadsToCrm)
            return;

        if (!string.Equals(envelope.Source, SurveyPackDefinition.EventSource, StringComparison.OrdinalIgnoreCase))
            return;

        var submissionId = TryReadGuid(envelope.Data, "submissionId");
        if (submissionId is null)
            return;

        await AssessmentCrmBridge.SyncSubmissionLeadAsync(
            _repo,
            envelope.TenantId,
            submissionId.Value,
            _logger,
            cancellationToken);
    }

    private static Guid? TryReadGuid(object? data, string propertyName)
    {
        if (data is not JsonElement element || element.ValueKind != JsonValueKind.Object)
            return null;
        if (!element.TryGetProperty(propertyName, out var prop))
            return null;
        return prop.ValueKind == JsonValueKind.String && Guid.TryParse(prop.GetString(), out var id) ? id : null;
    }
}

internal static class AssessmentCrmBridge
{
    public static async Task SyncSubmissionLeadAsync(
        AssessmentRepository repo,
        Guid tenantId,
        Guid submissionId,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var submission = await repo.GetSubmissionByIdAsync(submissionId, cancellationToken);
        if (submission is null || string.IsNullOrWhiteSpace(submission.RespondentPhone))
            return;

        var workspaceId = await repo.GetCrmWorkspaceIdAsync(tenantId, cancellationToken);
        if (workspaceId is null)
        {
            logger.LogWarning(
                "KAP CRM sync skipped — clinic_crm workspace missing for tenant {TenantId}",
                tenantId);
            return;
        }

        var leadCode = $"KAP-{submissionId.ToString("N")[..8].ToUpperInvariant()}";
        var notes = $"KAP submission {submissionId} · template {submission.TemplateCode} v{submission.TemplateVersion}";
        if (submission.OverallPct.HasValue)
            notes += $" · score {submission.OverallPct:F1}%";

        var metadata = JsonSerializer.Serialize(new
        {
            kapSubmissionId = submissionId,
            submission.TemplateCode,
            submission.TemplateVersion,
            submission.OverallScore,
            submission.OverallPct,
        });

        var crmId = await repo.InsertCrmLeadFromAssessmentAsync(
            tenantId,
            workspaceId,
            leadCode,
            submission.RespondentName?.Trim() ?? submission.RespondentOrgName?.Trim() ?? "Lead KAP",
            submission.RespondentPhone,
            submission.RespondentEmail,
            notes,
            metadata,
            cancellationToken);

        if (crmId.HasValue)
        {
            logger.LogInformation(
                "KAP lead synced to CRM {CrmLeadId} from submission {SubmissionId}",
                crmId,
                submissionId);
        }
    }
}
