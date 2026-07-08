using System.Text.Json;
using Microsoft.AspNetCore.Http.Features;

namespace KitPlatform.Api.Sse;

internal static class SseWriter
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public static void PrepareResponse(HttpResponse response)
    {
        response.Headers.ContentType = "text/event-stream";
        response.Headers.CacheControl = "no-cache";
        response.Headers.Connection = "keep-alive";

        var bodyFeature = response.HttpContext.Features.Get<IHttpResponseBodyFeature>();
        bodyFeature?.DisableBuffering();
    }

    public static async Task WriteEventAsync<T>(
        HttpResponse response,
        T payload,
        CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(payload, JsonOptions);
        await response.WriteAsync($"data: {json}\n\n", cancellationToken);
        await response.Body.FlushAsync(cancellationToken);
    }

    public static async Task WriteKeepAliveAsync(HttpResponse response, CancellationToken cancellationToken)
    {
        await response.WriteAsync(": keepalive\n\n", cancellationToken);
        await response.Body.FlushAsync(cancellationToken);
    }
}
