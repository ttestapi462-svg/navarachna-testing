using Navarachna.Api.Data;
using EmployeeApi.Infrastructure;
using EmployeeApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EmployeeApi.Services;

public class EmployeeService(AppDbContext db)
{
    public async Task<PagedResult<EmployeeResponse>> ListAsync(
        string? search, string? department, int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = db.Employees.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(department)) q = q.Where(e => e.Department == department);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            q = q.Where(e => e.FirstName.ToLower().Contains(s) ||
                             (e.LastName != null && e.LastName.ToLower().Contains(s)) ||
                             e.EmployeeCode.ToLower().Contains(s) ||
                             e.Email.ToLower().Contains(s));
        }

        var total = await q.CountAsync(ct);
        var rows = await q.Include(e => e.Documents).OrderBy(e => e.Id)
                          .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new PagedResult<EmployeeResponse>(rows.Select(ToResponse).ToList(), page, pageSize, total);
    }

    public async Task<EmployeeResponse> GetAsync(int id, CancellationToken ct)
    {
        var e = await db.Employees.AsNoTracking().Include(x => x.Documents)
                        .FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new AppException(404, "Employee not found.");
        return ToResponse(e);
    }

    public async Task<EmployeeResponse> CreateAsync(EmployeeRequest r, CancellationToken ct)
    {
        if (await db.Employees.IgnoreQueryFilters().AnyAsync(e => e.Email == r.Email, ct))
            throw new AppException(409, "An employee with this email already exists.");

        var seq = await db.Database
            .SqlQuery<int>($"SELECT nextval('employee_code_seq') AS \"Value\"").SingleAsync(ct);

        var e = new Employee { EmployeeCode = $"EMP-{r.DateOfJoining.Year}-{seq:D5}" };
        Apply(e, r);
        db.Employees.Add(e);
        await db.SaveChangesAsync(ct);
        return ToResponse(e);
    }

    public async Task<EmployeeResponse> UpdateAsync(int id, EmployeeRequest r, CancellationToken ct)
    {
        var e = await db.Employees.Include(x => x.Documents).FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new AppException(404, "Employee not found.");

        if (await db.Employees.AnyAsync(x => x.Email == r.Email && x.Id != id, ct))
            throw new AppException(409, "Email already used by another employee.");

        db.Entry(e).Property(x => x.Version).OriginalValue = r.Version;   // optimistic lock
        Apply(e, r);

        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException)
        {
            throw new AppException(409, "This record was modified by someone else. Reload and retry.");
        }
        return ToResponse(e);
    }

    public async Task DeleteAsync(int id, CancellationToken ct)
    {
        var e = await db.Employees.FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new AppException(404, "Employee not found.");
        e.IsActive = false;                    // soft delete; files are retained for audit
        await db.SaveChangesAsync(ct);
    }

    private static void Apply(Employee e, EmployeeRequest r)
    {
        e.FirstName = r.FirstName.Trim();
        e.LastName = r.LastName?.Trim();
        e.Email = r.Email.Trim().ToLowerInvariant();
        e.Mobile = r.Mobile;
        e.PanNumber = r.PanNumber;
        if (!string.IsNullOrEmpty(r.AadhaarNumber)) e.AadhaarLast4 = r.AadhaarNumber[^4..];
        e.Department = r.Department;
        e.Designation = r.Designation;
        e.Salary = r.Salary;
        e.DateOfJoining = r.DateOfJoining;
    }

    private static EmployeeResponse ToResponse(Employee e) => new(
        e.Id, e.EmployeeCode, e.FirstName, e.LastName, e.Email, e.Mobile,
        e.PanNumber is { Length: 10 } p ? $"{p[..5]}****{p[9]}" : null,
        e.AadhaarLast4 is null ? null : $"XXXX XXXX {e.AadhaarLast4}",
        e.Department, e.Designation, e.Salary, e.DateOfJoining, e.IsActive, e.CreatedAt, e.Version,
        e.Documents.Select(d => new DocumentResponse(d.Id, d.DocumentType, d.OriginalFileName,
            d.ContentType, d.SizeBytes, d.UploadedAt)).ToList());
}