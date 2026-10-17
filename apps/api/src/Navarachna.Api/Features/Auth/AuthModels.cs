namespace Navarachna.Api.Features.Auth;

public record LoginRequest(string Email, string Password);

public record UserDto(Guid Id, string Email, string FullName, string Role);

public record AuthResponse(bool Success, string Message, UserDto? User, string? SessionToken = null);
