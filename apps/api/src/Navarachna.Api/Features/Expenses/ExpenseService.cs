using Microsoft.EntityFrameworkCore;
using Navarachna.Api.Data;
using Navarachna.Api.Entities;

namespace Navarachna.Api.Features.Expenses;

public class ExpenseService(
    AppDbContext db,
    IBillStorage storage,
    ILogger<ExpenseService> log)
{
    public async Task<ExpenseResponse> CreateAsync(
        ExpenseForm f,
        long? userId,
        CancellationToken ct)
    {
        var bill = await storage.UploadAsync(f.Bill!, ct);

        var expense = new Expense
        {
            ExpenseDate = f.ExpenseDate!.Value,
            Amount = f.Amount!.Value,
            CategoryNotes = f.CategoryNotes!.Trim(),
            BillBlobName = bill.BlobName,
            BillFileName = bill.FileName,
            BillContentType = bill.ContentType,
            CreatedBy = userId
            // CreatedAt is set by AppDbContext.SaveChangesAsync
        };

        try
        {
            db.Expenses.Add(expense);
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            await TryDeleteBlobAsync(bill.BlobName);
            throw;
        }

        return ToResponse(expense);
    }

    public async Task<PagedResult<ExpenseResponse>> ListAsync(
        ExpenseQuery q,
        CancellationToken ct)
    {
        var query = db.Expenses.AsNoTracking();

        if (q.FromDate is not null)
            query = query.Where(e => e.ExpenseDate >= q.FromDate);

        if (q.ToDate is not null)
            query = query.Where(e => e.ExpenseDate <= q.ToDate);

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var term = q.Search.Trim().ToLower();
            query = query.Where(
                e => e.CategoryNotes.ToLower().Contains(term));
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(e => e.ExpenseDate)
            .ThenByDescending(e => e.CreatedAt)
            .Skip((q.Page - 1) * q.PageSize)
            .Take(q.PageSize)
            .ToListAsync(ct);

        return new PagedResult<ExpenseResponse>(
            items.Select(ToResponse).ToList(),
            q.Page,
            q.PageSize,
            total);
    }

    public async Task<ExpenseResponse?> GetAsync(
        long id,
        CancellationToken ct)
    {
        var e = await db.Expenses
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        return e is null ? null : ToResponse(e);
    }

    public async Task<ExpenseResponse?> UpdateAsync(
        long id,
        ExpenseForm f,
        long? userId,
        CancellationToken ct)
    {
        var e = await db.Expenses
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (e is null)
            return null;

        string? oldBlob = null;
        string? newBlob = null;

        if (f.Bill is not null)
        {
            var bill = await storage.UploadAsync(f.Bill, ct);

            newBlob = bill.BlobName;
            oldBlob = e.BillBlobName;

            e.BillBlobName = bill.BlobName;
            e.BillFileName = bill.FileName;
            e.BillContentType = bill.ContentType;
        }

        e.ExpenseDate = f.ExpenseDate!.Value;
        e.Amount = f.Amount!.Value;
        e.CategoryNotes = f.CategoryNotes!.Trim();
        e.UpdatedBy = userId;

        // UpdatedAt is set by AppDbContext.SaveChangesAsync

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            if (newBlob is not null)
                await TryDeleteBlobAsync(newBlob);

            throw;
        }

        if (oldBlob is not null)
            await TryDeleteBlobAsync(oldBlob);

        return ToResponse(e);
    }

    /// <summary>
    /// Soft-deletes the expense and attempts to delete its bill
    /// from Azure Blob Storage.
    /// </summary>
    public async Task<bool> DeleteAsync(
        long id,
        long? userId,
        CancellationToken ct)
    {
        var e = await db.Expenses
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (e is null)
            return false;

        // Save the blob name before updating the expense.
        var blobName = e.BillBlobName;

        // Soft-delete the expense record.
        e.IsDeleted = true;
        e.DeletedBy = userId;
        e.DeletedAt = DateTime.UtcNow;
        e.UpdatedBy = userId;

        // Save the database changes first.
        await db.SaveChangesAsync(ct);

        // Delete the associated bill from Azure Blob Storage.
        if (!string.IsNullOrWhiteSpace(blobName))
        {
            await TryDeleteBlobAsync(blobName);
        }

        return true;
    }

    public async Task<(Stream Stream, string ContentType)?> GetBillAsync(
        long id,
        CancellationToken ct)
    {
        var e = await db.Expenses
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (e is null)
            return null;

        var stream = await storage.OpenReadAsync(e.BillBlobName, ct);

        return stream is null
            ? null
            : (stream, e.BillContentType);
    }

    private async Task TryDeleteBlobAsync(string blobName)
    {
        try
        {
            await storage.DeleteAsync(
                blobName,
                CancellationToken.None);
        }
        catch (Exception ex)
        {
            log.LogWarning(
                ex,
                "Could not delete blob {Blob}",
                blobName);
        }
    }

    private static ExpenseResponse ToResponse(Expense e) => new(
        e.Id,
        e.ExpenseDate,
        e.Amount,
        e.CategoryNotes,
        e.BillFileName,
        $"/api/expenses/{e.Id}/bill",
        e.CreatedBy,
        e.CreatedAt,
        e.UpdatedAt);
}