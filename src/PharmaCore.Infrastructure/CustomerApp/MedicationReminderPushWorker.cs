using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PharmaCore.Application.CustomerApp;

namespace PharmaCore.Infrastructure.CustomerApp;

internal sealed class MedicationReminderPushWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly CustomerAppPushOptions _options;
    private readonly ILogger<MedicationReminderPushWorker> _logger;

    public MedicationReminderPushWorker(
        IServiceScopeFactory scopeFactory,
        IOptions<CustomerAppPushOptions> options,
        ILogger<MedicationReminderPushWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("Medication reminder push worker is disabled.");
            return;
        }

        if (string.IsNullOrWhiteSpace(_options.PublicKey) || string.IsNullOrWhiteSpace(_options.PrivateKey))
        {
            _logger.LogWarning(
                "Medication reminder push worker skipped: configure CustomerAppPush:PublicKey and PrivateKey.");
            return;
        }

        var delay = TimeSpan.FromSeconds(Math.Max(15, _options.PollIntervalSeconds));
        _logger.LogInformation(
            "Medication reminder push worker started (interval={IntervalSeconds}s).",
            delay.TotalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var push = scope.ServiceProvider.GetRequiredService<ICustomerPushService>();
                var sent = await push.DispatchDueRemindersAsync(stoppingToken);
                if (sent > 0)
                    _logger.LogInformation("Sent {Count} medication reminder push notification(s).", sent);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Medication reminder push worker batch failed.");
            }

            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }
}
