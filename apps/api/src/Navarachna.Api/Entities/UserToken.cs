namespace Navarachna.Api.Entities;

public class UserToken
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public Guid SessionId { get; set; }
    public required string RefreshToken { get; set; }
    public string? DeviceName { get; set; }
    public string? IpAddress { get; set; }
    public bool IsRevoked { get; set; } = false;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RevokedAt { get; set; }
    public string? RevocationReason { get; set; }

    public User User { get; set; } = null!;
}
