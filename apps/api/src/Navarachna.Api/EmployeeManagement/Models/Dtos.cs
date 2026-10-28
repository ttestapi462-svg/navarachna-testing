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

    [RegularExpression(@"^[2-9]\d{11}$|^\d{4}$", ErrorMessage = "Aadhaar must be 12 digits")]
    public string? AadhaarNumber { get; set; }

    [Required] public string Department { get; set; } = default!;
    [Range(0, 100000000)] public decimal? Salary { get; set; }
    public DateOnly DateOfJoining { get; set; }
    public EmployeeCredentialsRequest? Credentials { get; set; }

    // Optional Edit-mode login update: change username and/or password.
    // Null/blank means "keep current" for that field.
    public string? LoginUsername { get; set; }
    public string? LoginPassword { get; set; }

    public uint Version { get; set; }                   // required on PUT
}

/// <summary>
/// Optional login credentials created alongside a new employee (admin grant).
/// </summary>
public class EmployeeCredentialsRequest
{
    [Required, MinLength(3), MaxLength(50)]
    [RegularExpression(@"^[a-zA-Z0-9_.-]+$",
        ErrorMessage = "Username may only contain letters, numbers, dot, underscore and hyphen.")]
    public string Username { get; set; } = default!;

    [Required]
    [RegularExpression(@"^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$",
        ErrorMessage = "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character.")]
    public string Password { get; set; } = default!;
}

public record DocumentResponse(int Id, DocumentType DocumentType, string FileName,
    string ContentType, long SizeBytes, DateTime UploadedAt);

public record EmployeeResponse(int Id, string FirstName, string? LastName,
    string Email, string Mobile, string? PanMasked, string? AadhaarMasked, string Department,
    decimal? Salary, DateOnly DateOfJoining, bool IsActive,
    DateTime CreatedAt, uint Version, List<DocumentResponse> Documents,
    string? PanNumber = null, string? AadhaarNumber = null,
    long? CreatedBy = null, DateTime? UpdatedAt = null, long? UpdatedBy = null,
    string? CreatedByUsername = null, string? UpdatedByUsername = null,
    string? LoginUsername = null);

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}
