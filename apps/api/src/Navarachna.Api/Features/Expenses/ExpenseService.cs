using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Navarachna.Api.Data;
using Navarachna.Api.Entities;
using Employee = EmployeeApi.Models.Employee;

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

        var userNames = await LoadAuditUserNamesAsync([expense.CreatedBy, expense.UpdatedBy], ct);
        return ToResponse(expense, ToSpecialistMap(employees), userNames);
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
            var term = q.Search.Trim().ToLowerInvariant();
            var matchingSpecialistIds = await db.Employees.AsNoTracking()
                .Where(employee =>
                    employee.FirstName.ToLower().Contains(term) ||
                    (employee.LastName ?? string.Empty).ToLower().Contains(term) ||
                    (employee.FirstName + " " + (employee.LastName ?? string.Empty)).ToLower().Contains(term))
                .Select(employee => employee.Id)
                .ToListAsync(ct);
            var matchingUserIds = await db.Users.AsNoTracking()
                .Where(user =>
                    user.Username.ToLower().Contains(term) ||
                    user.FirstName.ToLower().Contains(term) ||
                    (user.LastName ?? string.Empty).ToLower().Contains(term) ||
                    (user.FirstName + " " + (user.LastName ?? string.Empty)).ToLower().Contains(term))
                .Select(user => user.Id)
                .ToListAsync(ct);

            var amountSearch = term.Replace("₹", string.Empty).Replace(",", string.Empty).Trim();
            var hasAmountSearch = decimal.TryParse(amountSearch, NumberStyles.Number, CultureInfo.InvariantCulture, out var amountValue);
            var hasDateSearch = DateOnly.TryParse(q.Search.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out var dateValue);
            var hasYearSearch = int.TryParse(term, out var yearValue) && yearValue is >= 1000 and <= 9999;
            var hasMonthSearch = DateTime.TryParseExact(term, ["MMM", "MMMM"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var monthValue);
            var isReceiptAlias = term is "receipt" or "image";

            query = query.Where(e =>
                e.CategoryNotes.ToLower().Contains(term) ||
                (e.BillFileName ?? string.Empty).ToLower().Contains(term) ||
                (isReceiptAlias && e.BillFileName != string.Empty) ||
                (matchingSpecialistIds.Count > 0 && e.SourcingSpecialistIds.Any(id => matchingSpecialistIds.Contains(id))) ||
                (matchingUserIds.Count > 0 && ((e.CreatedBy.HasValue && matchingUserIds.Contains(e.CreatedBy.Value)) || (e.UpdatedBy.HasValue && matchingUserIds.Contains(e.UpdatedBy.Value)))) ||
                (hasAmountSearch && e.Amount == amountValue) ||
                (hasDateSearch && e.ExpenseDate == dateValue) ||
                (hasDateSearch && e.CreatedAt.Date == dateValue.ToDateTime(TimeOnly.MinValue).Date) ||
                (hasDateSearch && e.UpdatedAt.HasValue && e.UpdatedAt.Value.Date == dateValue.ToDateTime(TimeOnly.MinValue).Date) ||
                (hasYearSearch && (e.ExpenseDate.Year == yearValue || e.CreatedAt.Year == yearValue || (e.UpdatedAt.HasValue && e.UpdatedAt.Value.Year == yearValue))) ||
                (hasMonthSearch && (e.ExpenseDate.Month == monthValue.Month || e.CreatedAt.Month == monthValue.Month || (e.UpdatedAt.HasValue && e.UpdatedAt.Value.Month == monthValue.Month))));
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
        var userNames = await LoadAuditUserNamesAsync(
            items.SelectMany(expense => new[] { expense.CreatedBy, expense.UpdatedBy }), ct);

        return new PagedResult<ExpenseResponse>(
            items.Select(expense => ToResponse(expense, specialists, userNames)).ToList(),
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
        var userNames = await LoadAuditUserNamesAsync([e.CreatedBy, e.UpdatedBy], ct);
        return ToResponse(e, specialists, userNames);
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

        var userNames = await LoadAuditUserNamesAsync([e.CreatedBy, e.UpdatedBy], ct);
        return ToResponse(e, ToSpecialistMap(employees), userNames);
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

    private async Task<Dictionary<long, string>> LoadAuditUserNamesAsync(
        IEnumerable<long?> ids,
        CancellationToken ct)
    {
        var uniqueIds = ids
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToArray();
        if (uniqueIds.Length == 0)
            return [];

        var users = await db.Users.AsNoTracking()
            .Where(user => uniqueIds.Contains(user.Id))
            .Select(user => new { user.Id, user.FirstName, user.LastName, user.Username })
            .ToListAsync(ct);

        return users.ToDictionary(user => user.Id, user =>
        {
            var name = $"{user.FirstName} {user.LastName}".Trim();
            return string.IsNullOrWhiteSpace(name) ? user.Username : name;
        });
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
        IReadOnlyDictionary<int, SourcingSpecialistResponse> specialists,
        IReadOnlyDictionary<long, string> userNames) => new(
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
        e.CreatedBy is { } createdById && userNames.TryGetValue(createdById, out var createdByName) ? createdByName : null,
        e.CreatedAt,
        e.UpdatedBy,
        e.UpdatedBy is { } updatedById && userNames.TryGetValue(updatedById, out var updatedByName) ? updatedByName : null,
        e.UpdatedAt);
}
