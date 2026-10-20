namespace EmployeeApi.Models;

public class Employee
{
    public int Id { get; set; }
    public string EmployeeCode { get; set; } = default!;
    public string FirstName { get; set; } = default!;
    public string? LastName { get; set; }
    public string Email { get; set; } = default!;
    public string Mobile { get; set; } = default!;
    public string? PanNumber { get; set; }
    public string? AadhaarLast4 { get; set; }
    public string Department { get; set; } = default!;
    public string Designation { get; set; } = default!;
    public decimal Salary { get; set; }
    public DateOnly DateOfJoining { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public uint Version { get; set; }                  // maps to PostgreSQL xmin
    public List<EmployeeDocument> Documents { get; set; } = [];
}