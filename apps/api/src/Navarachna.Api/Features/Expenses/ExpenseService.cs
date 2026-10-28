using Microsoft.EntityFrameworkCore;
using Navarachna.Api.Data;
using Navarachna.Api.Entities;

namespace Navarachna.Api.Features.Expenses;

public class ExpenseService(
    AppDbContext db,
    IBillStorage storage,
    ILogger<ExpenseService> log)
{
    public async Task<IReadOnlyList<SourcingSpecialistOptionResponse>> GetActiveSourcingSpecialistsAsync(CancellationToken ct)
    {
        return await db.Employees.AsNoTracking()
            .Where(employee => employee.IsActive &&
                employee.Department != null &&
                employee.Department.Trim().ToLower() == "sourcing specialist")
            .OrderBy(employee => employee.FirstName)
            .ThenBy(employee => employee.LastName)
            .Select(employee => new SourcingSpecialistOptionResponse(
                employee.Id,
                employee.FirstName,
                employee.LastName,
                (employee.FirstName + " " + (employee.LastName ?? "")).Trim(),
                employee.Mobile))
            .ToListAsync(ct);
    }

    public async Task<Dictionary<string, string[]>> ValidateSourcingSpecialistsAsync(
        IReadOnlyCollection<int> ids,
        CancellationToken ct)
    {
        if (ids.Count == 0)
            return new Dictionary<string, string[]> { ["sourcingSpecialistIds"] = ["Select at least one staff member."] };

        var uniqueIds = ids.Distinct().ToArray();
        var activeCount = await db.Employees.CountAsync(
            employee => employee.IsActive && uniqueIds.Contains(employee.Id), ct);
        return activeCount == uniqueIds.Length
            ? new Dictionary<string, string[]>()
            : new Dictionary<string, string[]> { ["sourcingSpecialistIds"] = ["Choose only active staff members."] };
    }

    public async Task<ExpenseResponse> CreateAsync(
        ExpenseForm f,
        long? userId,
        CancellationToken ct)
    {
        var employees = await db.Employees
            .Where(employee => f.SourcingSpecialistIds.Distinct().Contains(employee.Id))
            .ToDictionaryAsync(employee => employee.Id, ct);
        var strategy = db.Database.CreateExecutionStrategy();
        var expense = await strategy.ExecuteAsync(async () =>
        {
            var createdExpense = new Expense
            {
                ExpenseDate = f.ExpenseDate!.Value,
                Amount = f.Amount!.Value,
                CategoryNotes = f.CategoryNotes?.Trim() ?? string.Empty,
                BillBlobName = string.Empty,
                BillFileName = string.Empty,
                BillContentType = string.Empty,
                SourcingSpecialistIds = f.SourcingSpecialistIds.Distinct().ToArray(),
                CreatedBy = userId
                // CreatedAt is set by AppDbContext.SaveChangesAsync
            };

            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            StoredBill? bill = null;
            try
            {
                // Save once to allocate the expense number used in the blob filename.
                db.Expenses.Add(createdExpense);
                await db.SaveChangesAsync(ct);

                bill = await storage.UploadAsync(
                    f.Bill!, createdExpense.Id, createdExpense.ExpenseDate, userId, ct);
                createdExpense.BillBlobName = bill.BlobName;
                createdExpense.BillFileName = bill.FileName;
                createdExpense.BillContentType = bill.ContentType;
                await db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
                return createdExpense;
            }
            catch
            {
                if (bill is not null)
                    await TryDeleteBlobAsync(bill.BlobName);

                try
                {
                    await transaction.RollbackAsync(CancellationToken.None);
                }
                catch (Exception rollbackException)
                {
                    log.LogWarning(rollbackException, "Could not roll back failed expense creation transaction.");
                }

                db.Entry(createdExpense).State = EntityState.Detached;
                throw;
            }
        });

        return ToResponse(expense, ToSpecialistMap(employees));
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

        var specialists = await LoadSourcingSpecialistsAsync(
            items.SelectMany(expense => expense.SourcingSpecialistIds), ct);

        return new PagedResult<ExpenseResponse>(
            items.Select(expense => ToResponse(expense, specialists)).ToList(),
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

        if (e is null)
            return null;

        var specialists = await LoadSourcingSpecialistsAsync(e.SourcingSpecialistIds, ct);
        return ToResponse(e, specialists);
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

        var employees = await db.Employees
            .Where(employee => f.SourcingSpecialistIds.Distinct().Contains(employee.Id))
            .ToDictionaryAsync(employee => employee.Id, ct);

        string? oldBlob = null;
        string? newBlob = null;

        if (f.Bill is not null)
        {
            var bill = await storage.UploadAsync(f.Bill, e.Id, f.ExpenseDate!.Value, userId, ct);

            newBlob = bill.BlobName;
            oldBlob = e.BillBlobName;

            e.BillBlobName = bill.BlobName;
            e.BillFileName = bill.FileName;
            e.BillContentType = bill.ContentType;
        }

        e.ExpenseDate = f.ExpenseDate!.Value;
        e.Amount = f.Amount!.Value;
        e.CategoryNotes = f.CategoryNotes?.Trim() ?? string.Empty;
        e.SourcingSpecialistIds = f.SourcingSpecialistIds.Distinct().ToArray();
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

        if (oldBlob is not null && !string.Equals(oldBlob, newBlob, StringComparison.Ordinal))
            await TryDeleteBlobAsync(oldBlob);

        return ToResponse(e, ToSpecialistMap(employees));
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

    private async Task<Dictionary<int, SourcingSpecialistResponse>> LoadSourcingSpecialistsAsync(
        IEnumerable<int> ids,
        CancellationToken ct)
    {
        var uniqueIds = ids.Distinct().ToArray();
        if (uniqueIds.Length == 0)
            return [];

        var employees = await db.Employees.AsNoTracking()
            .Where(employee => uniqueIds.Contains(employee.Id))
            .ToDictionaryAsync(employee => employee.Id, ct);
        return ToSpecialistMap(employees);
    }

    private static Dictionary<int, SourcingSpecialistResponse> ToSpecialistMap(
        IReadOnlyDictionary<int, Employee> employees) => employees
        .ToDictionary(pair => pair.Key, pair => ToSpecialistResponse(pair.Value));

    private static SourcingSpecialistResponse ToSpecialistResponse(Employee employee) => new(
        employee.Id,
        employee.FirstName,
        employee.LastName,
        (employee.FirstName + " " + (employee.LastName ?? "")).Trim());

    private static ExpenseResponse ToResponse(
        Expense e,
        IReadOnlyDictionary<int, SourcingSpecialistResponse> specialists) => new(
        e.Id,
        e.ExpenseDate,
        e.Amount,
        e.CategoryNotes,
        e.SourcingSpecialistIds
            .Where(specialists.ContainsKey)
            .Select(id => specialists[id])
            .OrderBy(employee => employee.DisplayName, StringComparer.OrdinalIgnoreCase)
            .ToList(),
        e.BillFileName,
        $"/api/expenses/{e.Id}/bill",
        e.CreatedBy,
        e.CreatedAt,
        e.UpdatedAt);
}
