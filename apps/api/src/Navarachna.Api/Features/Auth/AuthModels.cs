namespace Navarachna.Api.Features.Auth;

public record LoginRequest(
    string Identifier, 
    string Password, 
    string? DeviceName = null, 
    bool ForceLogout = false
);

public record RefreshTokenRequest(string RefreshToken);

public record UserDto(
    long Id,
    string Username,
    string? Email,
    string FirstName,
    string? LastName,
    string? PhoneNumber,
    string? ActiveDeviceName,
    DateTime? SessionStartedAt,
    DateTime CreatedAt,
    long? CreatedBy,
    DateTime? UpdatedAt,
    long? UpdatedBy
);

public record AuthResponse(
    bool Success,
    string Message,
    string? Token = null,
    string? RefreshToken = null,
    UserDto? User = null,
    string? ErrorCode = null,
    bool RequiresForceLogout = false,
    string? ActiveDevice = null,
    DateTime? SessionStartedAt = null
);
