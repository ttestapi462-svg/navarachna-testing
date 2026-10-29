using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Navarachna.Api.Features.Expenses;

namespace Navarachna.Api.Common.Errors;

public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;
    private readonly IHostEnvironment _environment;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "An unhandled exception occurred: {Message}", exception.Message);

        var isStorageDown = exception is BillStorageUnavailableException;
        var status = isStorageDown
            ? StatusCodes.Status503ServiceUnavailable
            : StatusCodes.Status500InternalServerError;

        var problemDetails = new ProblemDetails
        {
            Status = status,
            Title = isStorageDown ? "Bill storage unavailable" : "Server Error",
            Type = "https://datatracker.ietf.org/doc/html/rfc7231#section-6.6.1",
            Detail = _environment.IsDevelopment()
                ? exception.ToString()
                : isStorageDown
                    ? "Could not save the bill file right now. Please try again shortly."
                    : "An unexpected error occurred. Please try again later.",
            Instance = httpContext.Request.Path
        };

        httpContext.Response.StatusCode = status;
        httpContext.Response.ContentType = "application/problem+json";

        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
        return true;
    }
}
