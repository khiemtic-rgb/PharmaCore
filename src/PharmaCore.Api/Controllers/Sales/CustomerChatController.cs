using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmaCore.Api.Authorization;
using PharmaCore.Api.Sse;
using PharmaCore.Application.Abstractions;
using PharmaCore.Application.CustomerApp;
using System.Security.Claims;

namespace PharmaCore.Api.Controllers.Sales;

[ApiController]
[Route("api/sales/customer-chat")]
public sealed class CustomerChatController : ControllerBase
{
    private readonly ICustomerChatService _chat;
    private readonly ITenantContext _tenant;
    private readonly IChatEventHub _events;

    public CustomerChatController(
        ICustomerChatService chat,
        ITenantContext tenant,
        IChatEventHub events)
    {
        _chat = chat;
        _tenant = tenant;
        _events = events;
    }

    [HttpGet("threads")]
    [Authorize(Policy = SalesPolicies.Read)]
    [ProducesResponseType(typeof(AdminChatThreadListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Threads(CancellationToken cancellationToken) =>
        Ok(await _chat.ListThreadsForStaffAsync(_tenant.TenantId, cancellationToken));

    [HttpGet("threads/{customerId:guid}/messages")]
    [Authorize(Policy = SalesPolicies.Read)]
    [ProducesResponseType(typeof(AdminChatMessageListResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> Messages(
        Guid customerId,
        [FromQuery] Guid? beforeId,
        [FromQuery] int limit = 50,
        CancellationToken cancellationToken = default) =>
        Ok(await _chat.ListMessagesForStaffAsync(
            _tenant.TenantId,
            customerId,
            beforeId,
            limit,
            cancellationToken));

    [HttpPost("threads/{customerId:guid}/messages")]
    [Authorize(Policy = SalesPolicies.Write)]
    [ProducesResponseType(typeof(CustomerChatMessageDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Send(
        Guid customerId,
        [FromBody] SendStaffChatMessageRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var staffName = User.FindFirstValue(ClaimTypes.Name);
            var created = await _chat.SendStaffMessageAsync(
                _tenant.TenantId,
                customerId,
                _tenant.UserId,
                staffName,
                request,
                cancellationToken);
            return CreatedAtAction(nameof(Messages), new { customerId }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("threads/{customerId:guid}/read")]
    [Authorize(Policy = SalesPolicies.Read)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkRead(Guid customerId, CancellationToken cancellationToken)
    {
        await _chat.MarkStaffReadAsync(_tenant.TenantId, customerId, cancellationToken);
        return NoContent();
    }

    [HttpGet("events")]
    [Authorize(Policy = SalesPolicies.Read)]
    [Produces("text/event-stream")]
    public async Task Events(CancellationToken cancellationToken)
    {
        SseWriter.PrepareResponse(Response);

        using var keepAlive = new PeriodicTimer(TimeSpan.FromSeconds(25));
        await using var events = _events
            .WatchStaffAsync(_tenant.TenantId, cancellationToken)
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
