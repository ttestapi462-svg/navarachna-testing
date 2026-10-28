using Navarachna.Api.Common;

namespace EmployeeApi.Models;

public class Employee : IAuditableEntity
{
    public int Id { get; set; }
    public string FirstName { get; set; } = default!;
    public string? LastName { get; set; }
    public string Email { get; set; } = default!;
    public string Mobile { get; set; } = default!;
    public string? PanNumber { get; set; }
    public string? AadhaarNumber { get; set; }

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public string? AadhaarLast4 => AadhaarNumber is { Length: >= 4 } a ? a[^4..] : AadhaarNumber;
    public string Department { get; set; } = default!;
    public decimal? Salary { get; set; }
    public DateOnly DateOfJoining { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }
    public uint Version { get; set; }                  // maps to PostgreSQL xmin
    public List<EmployeeDocument> Documents { get; set; } = [];
}
