using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using KitPlatform.Packs.Survey;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal sealed class KapBenchmarkAggregateWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly AssessmentSettings _settings;
    private readonly ILogger<KapBenchmarkAggregateWorker> _logger;

    public KapBenchmarkAggregateWorker(
        IServiceScopeFactory scopeFactory,
        IOptions<AssessmentSettings> settings,
        ILogger<KapBenchmarkAggregateWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _settings = settings.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_settings.BenchmarkAggregateEnabled)
        {
            _logger.LogInformation("KAP benchmark aggregate worker is disabled.");
            return;
        }

        var interval = TimeSpan.FromHours(Math.Max(1, _settings.BenchmarkAggregateIntervalHours));
        _logger.LogInformation("KAP benchmark aggregate worker started (interval={Hours}h).", interval.TotalHours);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<KapBenchmarkAggregateService>();
                var count = await service.RunAsync(stoppingToken);
                _logger.LogInformation("KAP benchmark aggregate completed: {Count} cohort(s) updated.", count);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "KAP benchmark aggregate failed.");
            }

            try
            {
                await Task.Delay(interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
