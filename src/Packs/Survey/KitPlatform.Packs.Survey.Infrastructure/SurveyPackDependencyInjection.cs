using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Packs.Survey.Infrastructure;

public static class SurveyPackDependencyInjection
{
    public static IServiceCollection AddSurveyPack(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<AssessmentSettings>(configuration.GetSection(AssessmentSettings.SectionName));

        services.AddScoped<AssessmentRepository>();
        services.AddScoped<IAssessmentTemplateService, AssessmentTemplateService>();
        services.AddScoped<IAssessmentSubmissionService, AssessmentSubmissionService>();
        services.AddScoped<IAssessmentAdminService, AssessmentAdminService>();

        services.AddScoped<SurveyCampaignRepository>();
        services.AddScoped<ISurveyCampaignService, SurveyCampaignService>();

        return services;
    }
}
