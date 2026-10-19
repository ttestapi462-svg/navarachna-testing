using Microsoft.EntityFrameworkCore;
using Navarachna.Api.Data;

namespace Navarachna.Api.Services;

public class TokenCleanupWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<TokenCleanupWorker> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromMinutes(30);

    public TokenCleanupWorker(IServiceProvider serviceProvider, ILogger<TokenCleanupWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_interval);

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                int deleted = await dbContext.UserTokens
                    .Where(t => t.ExpiresAt < DateTime.UtcNow || t.IsRevoked)
                    .ExecuteDeleteAsync(stoppingToken);

                if (deleted > 0)
                {
                    _logger.LogInformation("Background token cleanup purged {Count} expired/revoked session tokens.", deleted);
                }
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "Error occurred during background expired token cleanup.");
            }
        }
    }
}
