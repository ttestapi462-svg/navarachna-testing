using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace Navarachna.Api.Hubs;

[Authorize]
public class AuthHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var sessionId = Context.User?.FindFirst("session_id")?.Value;
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                     ?? Context.User?.FindFirst("sub")?.Value;

        if (!string.IsNullOrEmpty(sessionId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"session_{sessionId}");
        }

        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        }

        await base.OnConnectedAsync();
    }
}
