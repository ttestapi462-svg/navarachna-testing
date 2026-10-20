using Navarachna.Api.Data;
using EmployeeApi.Infrastructure;
using EmployeeApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeApi.Services;

public class DocumentService(AppDbContext db, IFileStorage storage)
{
    private const long MaxBytes = 5 * 1024 * 1024;

    private static readonly Dictionary<string, (string Mime, byte[] Magic)> Allowed = new()
    {
        [".pdf"]  = ("application/pdf", "%PDF"u8.ToArray()),
        [".jpg"]  = ("image/jpeg", [0xFF, 0xD8, 0xFF]),
        [".jpeg"] = ("image/jpeg", [0xFF, 0xD8, 0xFF]),
        [".png"]  = ("image/png", [0x89, 0x50, 0x4E, 0x47]),
    };

    public async Task<DocumentResponse> UploadAsync(int employeeId, DocumentType type,
        IFormFile file, string? user, CancellationToken ct)
    {
        if (!await db.Employees.AnyAsync(e => e.Id == employeeId, ct))
            throw new AppException(404, "Employee not found.");
        if (file is null || file.Length == 0) throw new AppException(400, "File is empty.");
        if (file.Length > MaxBytes) throw new AppException(400, "File exceeds the 5 MB limit.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!Allowed.TryGetValue(ext, out var rule))
            throw new AppException(400, "Only PDF, JPG and PNG files are allowed.");

        await using var stream = file.OpenReadStream();
        var header = new byte[rule.Magic.Length];
        await stream.ReadExactlyAsync(header, ct);
        if (!header.SequenceEqual(rule.Magic))
            throw new AppException(400, "File content does not match its extension.");
        stream.Position = 0;

        var path = await storage.SaveAsync(stream, ext, ct);

        // One document per type: replace the old one
        var existing = await db.EmployeeDocuments
            .FirstOrDefaultAsync(d => d.EmployeeId == employeeId && d.DocumentType == type, ct);
        var oldPath = existing?.StoredPath;
        if (existing is null)
        {
            existing = new EmployeeDocument { EmployeeId = employeeId, DocumentType = type };
            db.EmployeeDocuments.Add(existing);
        }

        existing.OriginalFileName = Path.GetFileName(file.FileName);
        existing.StoredPath = path;
        existing.ContentType = rule.Mime;
        existing.SizeBytes = file.Length;
        existing.UploadedAt = DateTime.UtcNow;
        existing.UploadedBy = user;

        await db.SaveChangesAsync(ct);
        if (oldPath is not null) await storage.DeleteAsync(oldPath, ct);

        return new DocumentResponse(existing.Id, existing.DocumentType, existing.OriginalFileName,
            existing.ContentType, existing.SizeBytes, existing.UploadedAt);
    }

    public async Task<List<DocumentResponse>> ListAsync(int employeeId, CancellationToken ct) =>
        await db.EmployeeDocuments.AsNoTracking().Where(d => d.EmployeeId == employeeId)
            .Select(d => new DocumentResponse(d.Id, d.DocumentType, d.OriginalFileName,
                d.ContentType, d.SizeBytes, d.UploadedAt)).ToListAsync(ct);

    public async Task<(Stream Stream, string ContentType, string FileName)> DownloadAsync(
        int employeeId, int docId, CancellationToken ct)
    {
        var d = await db.EmployeeDocuments.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == docId && x.EmployeeId == employeeId, ct)
                ?? throw new AppException(404, "Document not found.");
        return (await storage.OpenAsync(d.StoredPath, ct), d.ContentType, d.OriginalFileName);
    }

    public async Task DeleteAsync(int employeeId, int docId, CancellationToken ct)
    {
        var d = await db.EmployeeDocuments
                    .FirstOrDefaultAsync(x => x.Id == docId && x.EmployeeId == employeeId, ct)
                ?? throw new AppException(404, "Document not found.");
        db.EmployeeDocuments.Remove(d);
        await db.SaveChangesAsync(ct);
        await storage.DeleteAsync(d.StoredPath, ct);
    }
}