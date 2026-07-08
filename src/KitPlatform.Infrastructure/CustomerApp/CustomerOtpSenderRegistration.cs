using System.Net.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Infrastructure.CustomerApp;

internal static class CustomerOtpSenderRegistration
{
    public static IServiceCollection AddCustomerOtpSender(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        services.Configure<CustomerAppSmsSettings>(configuration.GetSection(CustomerAppSmsSettings.SectionName));

        if (environment.IsDevelopment())
        {
            services.AddSingleton<ICustomerOtpSender, LogCustomerOtpSender>();
            return services;
        }

        var provider = configuration.GetSection(CustomerAppSmsSettings.SectionName)["Provider"] ?? "Http";
        if (provider.Equals("Log", StringComparison.OrdinalIgnoreCase))
        {
            services.AddSingleton<ICustomerOtpSender, LogCustomerOtpSender>();
            return services;
        }

        services.AddHttpClient<ICustomerOtpSender, HttpCustomerOtpSender>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(15);
            client.DefaultRequestVersion = new Version(1, 1);
        })
        .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
        {
            ConnectTimeout = TimeSpan.FromSeconds(5),
        });

        return services;
    }
}
