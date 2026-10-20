using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeApi.Infrastructure;

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> log) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        if (ex is not AppException appException)
            return false; // Let Navarachna's existing handler process unrelated exceptions.

        ctx.Response.StatusCode = appException.Status;
        await ctx.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = appException.Status,
            Title = appException.Message,
            Instance = ctx.Request.Path
        }, ct);
        return true;
    }
}
