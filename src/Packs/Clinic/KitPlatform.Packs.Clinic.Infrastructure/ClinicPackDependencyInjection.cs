using Microsoft.Extensions.DependencyInjection;
using KitPlatform.Packs.Clinic;

namespace KitPlatform.Packs.Clinic.Infrastructure;

public static class ClinicPackDependencyInjection
{
    public static IServiceCollection AddClinicPack(this IServiceCollection services)
    {
        services.AddScoped<ClinicAppointmentRepository>();
        services.AddScoped<IClinicAppointmentService, ClinicAppointmentService>();
        services.AddScoped<ClinicVisitRepository>();
        services.AddScoped<IClinicVisitService, ClinicVisitService>();
        services.AddScoped<CrmLeadRepository>();
        services.AddScoped<ICrmLeadService, CrmLeadService>();
        return services;
    }
}
