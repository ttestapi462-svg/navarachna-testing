namespace Navarachna.Api.Entities;

/// <summary>Read-only mapping to the existing public."Employees" table.</summary>
public class Employee
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string? LastName { get; set; }
    public string? Mobile { get; set; }
    public string? Department { get; set; }
    public bool IsActive { get; set; }
}
