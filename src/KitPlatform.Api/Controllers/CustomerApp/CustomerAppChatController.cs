using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using KitPlatform.Api.Authorization;
using KitPlatform.Api.Sse;
using KitPlatform.Application.Abstractions;
using KitPlatform.Application.Core;
using KitPlatform.Application.CustomerApp;

namespace KitPlatform.Api.Controllers.CustomerApp;

[ApiController]
[Route("api/customer-app/chat")]
[Authorize(Policy = CustomerAppPolicies.Authenticated)]
[RequirePlatformModule(PlatformModuleCodes.CustomerApp)]
public sealed class CustomerAppChatController : ControllerBase
{
    private readonly ICustomerChatService _chat;
    private readonly ICurrentCustomerAccessor _customer;
    private readonly IChatEventHub _events;

    public CustomerAppChatController(
        ICustomerChatService chat,
        ICurrentCustomerAccessor customer,
        IChatEventHub events)
    {
        _chat = chat;
        _customer = customer;
        _events = events;
    }

    [HttpGet("thread")]
    [ProducesResponseType(typeof(CustomerChatThreadDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Thread(CancellationToken cancellationToken) =>
        Ok(await _chat.GetThreadAsync(_customer.TenantId, _customer.CustomerId, cancellationToken));

    [HttpGet("messages")]
    [ProducesResponseType(typeof(CustomerChatMessageListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Messages(
        [FromQuery] Guid? beforeId,
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default) =>
        Ok(await _chat.ListMessagesAsync(
            _customer.TenantId,
            _customer.CustomerId,
            beforeId,
            limit,
            cancellationToken));

    [HttpPost("messages")]
    [ProducesResponseType(typeof(CustomerChatMessageDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Send(
        [FromBody] SendCustomerChatMessageRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await _chat.SendCustomerMessageAsync(
                _customer.TenantId,
                _customer.CustomerId,
                request,
                cancellationToken);
            return CreatedAtAction(nameof(Messages), new { }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkRead(CancellationToken cancellationToken)
    {
        await _chat.MarkCustomerReadAsync(_customer.TenantId, _customer.CustomerId, cancellationToken);
        return NoContent();
    }

    [HttpGet("events")]
    [Produces("text/event-stream")]
    public async Task Events(CancellationToken cancellationToken)
    {
        SseWriter.PrepareResponse(Response);

        using var keepAlive = new PeriodicTimer(TimeSpan.FromSeconds(25));
        await using var events = _events
            .WatchCustomerAsync(_customer.TenantId, _customer.CustomerId, cancellationToken)
            .GetAsyncEnumerator(cancellationToken);

        while (!cancellationToken.IsCancellationRequested)
        {
            var nextEvent = events.MoveNextAsync().AsTask();
            var completed = await Task.WhenAny(nextEvent, keepAlive.WaitForNextTickAsync(cancellationToken).AsTask());

            if (completed == nextEvent)
            {
                if (!await nextEvent)
                    break;

                await SseWriter.WriteEventAsync(Response, events.Current, cancellationToken);
                continue;
            }

            await SseWriter.WriteKeepAliveAsync(Response, cancellationToken);
        }
    }
}
