namespace EmployeeApi.Models;

public enum DocumentType { Aadhaar = 1, Pan = 2, Other = 3 }

public class EmployeeDocument
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = default!;
    public DocumentType DocumentType { get; set; }
    public string OriginalFileName { get; set; } = default!;
    public string StoredPath { get; set; } = default!;   // relative path, never exposed
    public string ContentType { get; set; } = default!;
    public long SizeBytes { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public string? UploadedBy { get; set; }
}