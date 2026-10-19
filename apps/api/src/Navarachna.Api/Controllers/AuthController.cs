using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Navarachna.Api.Data;
using Navarachna.Api.Entities;
using Navarachna.Api.Features.Auth;
using Navarachna.Api.Hubs;

namespace Navarachna.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ITokenService _tokenService;
    private readonly IPasswordService _passwordService;
    private readonly IMemoryCache _memoryCache;
    private readonly IHubContext<AuthHub> _hubContext;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext dbContext,
        ITokenService tokenService,
        IPasswordService passwordService,
        IMemoryCache memoryCache,
        IHubContext<AuthHub> hubContext,
        ILogger<AuthController> logger)
    {
        _dbContext = dbContext;
        _tokenService = tokenService;
        _passwordService = passwordService;
        _memoryCache = memoryCache;
        _hubContext = hubContext;
        _logger = logger;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Identifier) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new AuthResponse(false, "Username/Email and password are required."));
        }

        var identifier = request.Identifier.Trim().ToLowerInvariant();
        User? user = null;

        try
        {
            user = identifier.Contains('@')
                ? await _dbContext.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == identifier)
                : await _dbContext.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == identifier);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Database lookup error during login.");
            return StatusCode(500, new AuthResponse(false, "Database connection error."));
        }

        if (user == null)
        {
            return Unauthorized(new AuthResponse(false, "Invalid credentials.", ErrorCode: "INVALID_CREDENTIALS"));
        }

        // Account Status Checks
        if (!user.IsActive)
        {
            return Unauthorized(new AuthResponse(false, "Account is disabled. Please contact the studio manager.", ErrorCode: "ACCOUNT_DISABLED"));
        }

        if (user.IsLocked || (user.LockoutUntil.HasValue && user.LockoutUntil.Value > DateTime.UtcNow))
        {
            var remainingMins = user.LockoutUntil.HasValue 
                ? (int)Math.Ceiling((user.LockoutUntil.Value - DateTime.UtcNow).TotalMinutes) 
                : 15;
            return Unauthorized(new AuthResponse(false, $"Account is temporarily locked. Try again in {remainingMins} minute(s).", ErrorCode: "ACCOUNT_LOCKED"));
        }

        // Password Verification
        bool isPasswordValid = _passwordService.VerifyPassword(user, user.PasswordHash, request.Password);
        
        // Upgrade bootstrap plaintext during initial dev seeding to secure PBKDF2 hash on first successful login
        if (isPasswordValid && user.PasswordHash == request.Password)
        {
            user.PasswordHash = _passwordService.HashPassword(user, request.Password);
        }

        if (!isPasswordValid)
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= 5)
            {
                user.LockoutUntil = DateTime.UtcNow.AddMinutes(15);
                _logger.LogWarning("User {Username} locked out due to 5 consecutive failed login attempts.", user.Username);
            }
            await _dbContext.SaveChangesAsync();

            return Unauthorized(new AuthResponse(false, "Invalid credentials.", ErrorCode: "INVALID_CREDENTIALS"));
        }

        // Reset failed login counter on success
        user.FailedLoginAttempts = 0;
        user.LockoutUntil = null;
        user.LastLoginAt = DateTime.UtcNow;

        var deviceName = string.IsNullOrWhiteSpace(request.DeviceName) ? "Web Dashboard" : request.DeviceName.Trim();

        // SINGLE ACTIVE SESSION ENFORCEMENT & GHOST SESSION AUTO-CLEAR:
        // A session is ONLY considered active if an actual unrevoked, unexpired token exists in tbl_user_tokens.
        // We only need to check the database if user has an active session AND caller hasn't confirmed force logout.
        bool hasLiveToken = false;
        if (user.ActiveSessionId.HasValue && !request.ForceLogout)
        {
            hasLiveToken = await _dbContext.UserTokens
                .AnyAsync(t => t.UserId == user.Id 
                            && t.SessionId == user.ActiveSessionId 
                            && !t.IsRevoked 
                            && t.ExpiresAt > DateTime.UtcNow);
        }

        // If active_session_id exists in tbl_users but no live token exists in tbl_user_tokens,
        // it means the previous session naturally expired or was abandoned. Auto-clear it!
        if (user.ActiveSessionId.HasValue && !hasLiveToken && !request.ForceLogout)
        {
            user.ActiveSessionId = null;
            user.ActiveDeviceName = null;
            user.SessionStartedAt = null;
        }

        // If a real live session is currently active on another device and the caller hasn't confirmed force logout:
        if (hasLiveToken && !request.ForceLogout)
        {
            return Conflict(new AuthResponse(
                Success: false,
                Message: $"An active session is currently running on '{user.ActiveDeviceName ?? "Another Device"}'.",
                ErrorCode: "REQUIRES_FORCE_LOGOUT",
                RequiresForceLogout: true,
                ActiveDevice: user.ActiveDeviceName ?? "Another Device",
                SessionStartedAt: user.SessionStartedAt
            ));
        }

        // Capture previous active session ID before generating new one
        var oldSessionId = user.ActiveSessionId;

        // 1. Generate new Session ID
        var newSessionId = Guid.NewGuid();

        // 2. HARD DELETE all previous tokens for THIS user
        // Requirement: tbl_user_tokens must never maintain older or superseded records for the active user
        await _dbContext.UserTokens
            .Where(t => t.UserId == user.Id)
            .ExecuteDeleteAsync();

        // 3. Update user active session fields
        user.ActiveSessionId = newSessionId;
        user.ActiveDeviceName = deviceName;
        user.SessionStartedAt = DateTime.UtcNow;

        // 4. Update in-memory cache for sub-millisecond validation
        _memoryCache.Set($"active_session_{user.Id}", newSessionId.ToString(), TimeSpan.FromSeconds(30));

        // 4b. Broadcast instant real-time kickoff to the old session group
        if (oldSessionId.HasValue && oldSessionId.Value != newSessionId)
        {
            await _hubContext.Clients.Group($"session_{oldSessionId.Value}").SendAsync("SessionSuperseded", new
            {
                code = "SESSION_SUPERSEDED",
                message = "Your session was terminated because a new login occurred on another device.",
                newDevice = deviceName
            });
        }

        // 5. Generate Access Token & Refresh Token
        var accessToken = _tokenService.GenerateAccessToken(user, newSessionId);
        var refreshTokenString = _tokenService.GenerateRefreshToken();

        var refreshToken = new UserToken
        {
            UserId = user.Id,
            SessionId = newSessionId,
            RefreshToken = refreshTokenString,
            DeviceName = deviceName,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            ExpiresAt = DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.UserTokens.Add(refreshToken);
        await _dbContext.SaveChangesAsync();

        var userDto = new UserDto(
            user.Id,
            user.Username,
            user.Email,
            user.FirstName,
            user.LastName,
            user.PhoneNumber,
            user.ActiveDeviceName,
            user.SessionStartedAt,
            user.CreatedAt,
            user.CreatedBy,
            user.UpdatedAt,
            user.UpdatedBy
        );

        return Ok(new AuthResponse(true, "Authentication successful.", accessToken, refreshTokenString, userDto));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return BadRequest(new AuthResponse(false, "Refresh token is required."));
        }

        var token = await _dbContext.UserTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.RefreshToken == request.RefreshToken);

        if (token == null || token.IsRevoked || token.ExpiresAt < DateTime.UtcNow)
        {
            if (token != null)
            {
                _dbContext.UserTokens.Remove(token);
                await _dbContext.SaveChangesAsync();
            }
            return Unauthorized(new AuthResponse(false, "Refresh token is invalid or expired.", ErrorCode: "TOKEN_INVALID"));
        }

        // Single Session Verification on Refresh
        if (token.User.ActiveSessionId != token.SessionId)
        {
            // Session was superseded by a newer login on another device - purge token immediately
            _dbContext.UserTokens.Remove(token);
            await _dbContext.SaveChangesAsync();

            return Unauthorized(new AuthResponse(
                false, 
                "Session was superseded by a newer login on another device.", 
                ErrorCode: "SESSION_SUPERSEDED"
            ));
        }

        if (!token.User.IsActive || token.User.IsLocked)
        {
            _dbContext.UserTokens.Remove(token);
            await _dbContext.SaveChangesAsync();
            return Unauthorized(new AuthResponse(false, "Account is disabled or locked.", ErrorCode: "ACCOUNT_DISABLED"));
        }

        // Generate new Access Token with the existing SessionId
        var newAccessToken = _tokenService.GenerateAccessToken(token.User, token.SessionId);
        
        // Refresh the in-memory cache
        _memoryCache.Set($"active_session_{token.UserId}", token.SessionId.ToString(), TimeSpan.FromSeconds(30));

        return Ok(new AuthResponse(true, "Token refreshed successfully.", newAccessToken, token.RefreshToken));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !long.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var sessionIdStr = User.FindFirstValue("session_id");

        var user = await _dbContext.Users.FindAsync(userId);
        if (user != null)
        {
            user.ActiveSessionId = null;
            user.ActiveDeviceName = null;
            user.SessionStartedAt = null;

            // HARD DELETE all tokens for this user on logout - no older records maintained at all
            await _dbContext.UserTokens
                .Where(t => t.UserId == userId)
                .ExecuteDeleteAsync();

            _memoryCache.Set($"active_session_{userId}", "REVOKED", TimeSpan.FromSeconds(30));
            await _dbContext.SaveChangesAsync();

            if (!string.IsNullOrEmpty(sessionIdStr))
            {
                await _hubContext.Clients.Group($"session_{sessionIdStr}").SendAsync("SessionTerminated", new
                {
                    code = "SESSION_TERMINATED",
                    message = "Your session has ended."
                });
            }
        }

        return Ok(new { success = true, message = "Logged out successfully." });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !long.TryParse(userIdStr, out var userId))
        {
            return Unauthorized();
        }

        var user = await _dbContext.Users.FindAsync(userId);
        if (user == null || !user.IsActive)
        {
            return Unauthorized();
        }

        var userDto = new UserDto(
            user.Id,
            user.Username,
            user.Email,
            user.FirstName,
            user.LastName,
            user.PhoneNumber,
            user.ActiveDeviceName,
            user.SessionStartedAt,
            user.CreatedAt,
            user.CreatedBy,
            user.UpdatedAt,
            user.UpdatedBy
        );

        return Ok(new { isAuthenticated = true, user = userDto });
    }
}
