namespace Navarachna.Api.Entities;

public class Customer
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public string? WhatsappNumber { get; set; }
    public string? AlternateMobile { get; set; }
    public string? Address { get; set; }
    public string? Area { get; set; }
    public string? City { get; set; }
    public string? Remarks { get; set; }
    public string? ProfilePhotoUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }

    // Navigation property
    public ICollection<ReferenceCloth> ReferenceCloths { get; set; } = new List<ReferenceCloth>();
}
