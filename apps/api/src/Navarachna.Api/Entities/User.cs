using Navarachna.Api.Common;

namespace Navarachna.Api.Entities;

public class User : IAuditableEntity
{
    public long Id { get; set; }
    public required string Username { get; set; }
    public string? Email { get; set; }
    public required string PasswordHash { get; set; }
    public required string FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsLocked { get; set; } = false;
    public int FailedLoginAttempts { get; set; } = 0;
    public DateTime? LockoutUntil { get; set; }

    // Single Active Session Enforcement
    public Guid? ActiveSessionId { get; set; }
    public string? ActiveDeviceName { get; set; }
    public DateTime? SessionStartedAt { get; set; }

    public DateTime? LastLoginAt { get; set; }

    // Audit Fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }

    // Navigation property for audit/refresh tokens
    public ICollection<UserToken> Tokens { get; set; } = new List<UserToken>();
}
