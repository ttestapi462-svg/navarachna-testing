namespace Navarachna.Api.Entities;

public class ReferenceCloth
{
    public long Id { get; set; }
    public long? OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public long CustomerId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public long? StatusId { get; set; }
    public string? StatusName { get; set; }
    public DateOnly? ReceivedDate { get; set; }
    public DateOnly? ReturnedDate { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public Customer? Customer { get; set; }
}
