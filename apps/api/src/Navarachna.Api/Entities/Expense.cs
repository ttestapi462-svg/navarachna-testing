using Navarachna.Api.Common;

namespace Navarachna.Api.Entities;

public class Expense : IAuditableEntity
{
    public long Id { get; set; }

    // Fields from the requirement document (section 3.3)
    public DateOnly ExpenseDate { get; set; }
    public decimal Amount { get; set; }
    public string CategoryNotes { get; set; } = default!; // single "category/notes" field, max 250 chars

    // Bill photo / copy (stored in Azure Blob Storage)
    public string BillBlobName { get; set; } = default!;
    public string BillFileName { get; set; } = default!;
    public string BillContentType { get; set; } = default!;

    // Audit fields (same pattern as User; CreatedAt / UpdatedAt are filled in AppDbContext.SaveChangesAsync)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public long? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }

    // Soft delete so the record stays on file
    public bool IsDeleted { get; set; }
    public long? DeletedBy { get; set; }
    public DateTime? DeletedAt { get; set; }
}
