using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using KitPlatform.Application.Platform.Events;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Packs.Survey.Infrastructure;

public static class SurveyPackDependencyInjection
{
    public static IServiceCollection AddSurveyPack(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<AssessmentSettings>(configuration.GetSection(AssessmentSettings.SectionName));
        services.Configure<PartnerPortalAuthSettings>(configuration.GetSection(PartnerPortalAuthSettings.SectionName));

        services.AddScoped<AssessmentRepository>();
        services.AddScoped<AssessmentIntelligenceRepository>();
        services.AddScoped<AssessmentAnalysisPipeline>();
        services.AddHttpClient<KapAiNarrativeService>();
        services.AddScoped<KapBenchmarkAggregateService>();
        services.AddHostedService<KapBenchmarkAggregateWorker>();
        services.AddScoped<IAssessmentTemplateService, AssessmentTemplateService>();
        services.AddScoped<IAssessmentSubmissionService, AssessmentSubmissionService>();
        services.AddScoped<IAssessmentAdminService, AssessmentAdminService>();
        services.AddScoped<IAssessmentKapAdminService, AssessmentKapAdminService>();

        services.AddScoped<AssessmentPartnerRepository>();
        services.AddScoped<PartnerPortalJwtTokenService>();
        services.AddScoped<IPartnerPortalAuthService, PartnerPortalAuthService>();
        services.AddScoped<IPartnerPortalService, PartnerPortalService>();
        services.AddScoped<IAssessmentPartnerAdminService, AssessmentPartnerAdminService>();

        services.AddScoped<SurveyCampaignRepository>();
        services.AddScoped<ISurveyCampaignService, SurveyCampaignService>();

        services.AddScoped<IPlatformEventHandler, Events.AssessmentLeadCapturedHandler>();

        return services;
    }
}
