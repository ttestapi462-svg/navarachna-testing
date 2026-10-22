using System.ComponentModel.DataAnnotations;

namespace EmployeeApi.Models;

public class EmployeeRequest
{
    [Required, MaxLength(100)] public string FirstName { get; set; } = default!;
    [MaxLength(100)] public string? LastName { get; set; }
    [Required, EmailAddress] public string Email { get; set; } = default!;

    [Required, RegularExpression(@"^[6-9]\d{9}$", ErrorMessage = "Invalid 10-digit Indian mobile")]
    public string Mobile { get; set; } = default!;

    [RegularExpression(@"^[A-Z]{5}[0-9]{4}[A-Z]$", ErrorMessage = "Invalid PAN format")]
    public string? PanNumber { get; set; }

    [RegularExpression(@"^[2-9]\d{11}$", ErrorMessage = "Aadhaar must be 12 digits")]
    public string? AadhaarNumber { get; set; }          // only last 4 digits are stored

    [Required] public string Department { get; set; } = default!;
    [Range(0, 100000000)] public decimal Salary { get; set; }
    public DateOnly DateOfJoining { get; set; }

    public uint Version { get; set; }                   // required on PUT
}

public record DocumentResponse(int Id, DocumentType DocumentType, string FileName,
    string ContentType, long SizeBytes, DateTime UploadedAt);

public record EmployeeResponse(int Id, string FirstName, string? LastName,
    string Email, string Mobile, string? PanMasked, string? AadhaarMasked, string Department,
    decimal Salary, DateOnly DateOfJoining, bool IsActive,
    DateTime CreatedAt, uint Version, List<DocumentResponse> Documents);

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}
