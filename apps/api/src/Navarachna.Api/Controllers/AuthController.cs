using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Navarachna.Api.Data;
using Navarachna.Api.Entities;
using Navarachna.Api.Features.Auth;

namespace Navarachna.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext dbContext, ILogger<AuthController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new AuthResponse(false, "Email and password are required.", null));
        }

        User? user = null;
        try
        {
            user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Database connection failed or not yet initialized. Falling back to development bootstrap credentials.");
        }

        bool isValid = false;
        if (user != null)
        {
            isValid = user.PasswordHash == request.Password;
        }
        else if (request.Email.Equals("admin@navarachna.com", StringComparison.OrdinalIgnoreCase) && 
                 request.Password == "Admin@1234")
        {
            user = new User
            {
                Email = "admin@navarachna.com",
                FullName = "Studio Admin",
                PasswordHash = "Admin@1234",
                Role = "Admin"
            };

            try
            {
                _dbContext.Users.Add(user);
                await _dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not persist bootstrap user to database. Continuing in-memory.");
            }

            isValid = true;
        }

        if (!isValid || user == null)
        {
            return Unauthorized(new AuthResponse(false, "Invalid credentials.", null));
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role)
        };

        var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var authProperties = new AuthenticationProperties
        {
            IsPersistent = true,
            ExpiresUtc = DateTimeOffset.UtcNow.AddDays(7),
            IssuedUtc = DateTimeOffset.UtcNow
        };

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(claimsIdentity),
            authProperties);

        var userDto = new UserDto(user.Id, user.Email, user.FullName, user.Role);
        return Ok(new AuthResponse(true, "Authentication successful.", userDto, user.Id.ToString()));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { success = true, message = "Logged out successfully." });
    }

    [HttpGet("me")]
    public IActionResult GetCurrentUser()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return Unauthorized(new { isAuthenticated = false });
        }

        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue(ClaimTypes.Email);
        var name = User.FindFirstValue(ClaimTypes.Name);
        var role = User.FindFirstValue(ClaimTypes.Role);

        return Ok(new
        {
            isAuthenticated = true,
            user = new
            {
                id,
                email,
                fullName = name,
                role
            }
        });
    }
}
