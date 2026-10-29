using Navarachna.Api.Data;
using EmployeeApi.Infrastructure;
using EmployeeApi.Models;
using Navarachna.Api.Entities;
using Navarachna.Api.Features.Auth;
using Microsoft.EntityFrameworkCore;

namespace EmployeeApi.Services;

public class EmployeeService(AppDbContext db, IPasswordService passwords)
{
    public async Task<PagedResult<EmployeeResponse>> ListAsync(
        string? search, string? department, int page, int pageSize, CancellationToken ct)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = db.Employees.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(department))
        {
            var depts = department.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            if (depts.Length == 1)
                q = q.Where(e => e.Department == depts[0]);
            else if (depts.Length > 1)
                q = q.Where(e => depts.Contains(e.Department));
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            q = q.Where(e => e.FirstName.ToLower().Contains(s) ||
                             (e.LastName != null && e.LastName.ToLower().Contains(s)) ||
                             e.Email.ToLower().Contains(s) ||
                             e.Mobile.Contains(s));
        }

        var total = await q.CountAsync(ct);
        var rows = await q.Include(e => e.Documents).OrderBy(e => e.Id)
                          .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        var usernames = await GetUsernamesAsync(rows, ct);
        var loginNames = await GetLoginUsernamesAsync(rows, ct);

        return new PagedResult<EmployeeResponse>(rows.Select(e => ToResponse(e, usernames, loginNames)).ToList(), page, pageSize, total);
    }

    public async Task<EmployeeResponse> GetAsync(int id, CancellationToken ct)
    {
        var e = await db.Employees.AsNoTracking().Include(x => x.Documents)
                        .FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new AppException(404, "Employee not found.");
        var getItemUsernames = await GetUsernamesAsync(new[] { e }, ct);
        var getItemLoginNames = await GetLoginUsernamesAsync(new[] { e }, ct);
        return ToResponse(e, getItemUsernames, getItemLoginNames);
    }

    public async Task<EmployeeResponse> CreateAsync(EmployeeRequest r, long? actorId, CancellationToken ct)
    {
        if (await db.Employees.IgnoreQueryFilters().AnyAsync(e => e.Email == r.Email, ct))
            throw new AppException(409, "An employee with this email already exists.");

        var e = new Employee();
        Apply(e, r);
        e.CreatedBy = actorId;

        // Optional admin-granted login credentials — created in the same transaction as the employee.
        if (r.Credentials is { } creds)
        {
            if (await db.Users.AnyAsync(u => u.Username == creds.Username || u.Email == r.Email, ct))
                throw new AppException(409, "A login with this username already exists.");

            var user = new User
            {
                Username = creds.Username,
                // Keep the login identity aligned with the normalized employee email.
                Email = e.Email,
                PasswordHash = "",
                FirstName = r.FirstName,
                LastName = r.LastName,
                PhoneNumber = r.Mobile,
                IsActive = true,
                CreatedBy = actorId,   // admin who granted the login
            };
            user.PasswordHash = passwords.HashPassword(user, creds.Password);
            db.Users.Add(user);
        }

        db.Employees.Add(e);
        await db.SaveChangesAsync(ct);
        var createItemUsernames = await GetUsernamesAsync(new[] { e }, ct);
        var createItemLoginNames = await GetLoginUsernamesAsync(new[] { e }, ct);
        return ToResponse(e, createItemUsernames, createItemLoginNames);
    }

    public async Task<EmployeeResponse> UpdateAsync(int id, EmployeeRequest r, long? actorId, CancellationToken ct)
    {
        var e = await db.Employees.Include(x => x.Documents).FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new AppException(404, "Employee not found.");

        if (await db.Employees.AnyAsync(x => x.Email == r.Email && x.Id != id, ct))
            throw new AppException(409, "Email already used by another employee.");

        db.Entry(e).Property(x => x.Version).OriginalValue = r.Version;   // optimistic lock
        Apply(e, r);
        e.UpdatedBy = actorId;
        e.UpdatedAt = DateTime.UtcNow;

        // Optional admin-managed login update (Edit mode): change username and/or password.
        // A login-less employee gets credentials created; a revoked (inactive) login
        // is re-activated so "Remove Login" can later show its confirmation dialog again.
        long? passwordResetUserId = null;
        if (!string.IsNullOrWhiteSpace(r.LoginUsername) || !string.IsNullOrWhiteSpace(r.LoginPassword))
        {
            var newUsername = r.LoginUsername?.Trim();
            var newPassword = r.LoginPassword;

            var loginUser = await db.Users.FirstOrDefaultAsync(
                u => u.Email != null && u.Email.Trim().ToLower() == e.Email, ct);
            if (loginUser is null)
            {
                // No login exists yet (never created): both fields are required to grant one.
                if (string.IsNullOrWhiteSpace(newUsername) || string.IsNullOrWhiteSpace(newPassword))
                    throw new AppException(400, "Enter both a username and a password to create login credentials for this employee.");

                if (await db.Users.AnyAsync(u => u.Username == newUsername, ct))
                    throw new AppException(409, "A login with this username already exists.");

                if (!IsStrongPassword(newPassword))
                    throw new AppException(400, "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character.");

                loginUser = new User
                {
                    Username = newUsername,
                    Email = e.Email,
                    PasswordHash = "",
                    FirstName = e.FirstName,
                    LastName = e.LastName,
                    PhoneNumber = e.Mobile,
                    IsActive = true,
                    CreatedBy = actorId,   // admin who granted the login
                };
                loginUser.PasswordHash = passwords.HashPassword(loginUser, newPassword);
                db.Users.Add(loginUser);
            }
            else
            {
                // A previously removed login (IsActive = false) is re-granted when new
                // credentials are saved: restore it without leaving the session binding stale.
                if (!loginUser.IsActive)
                {
                    loginUser.IsActive = true;
                    loginUser.ActiveSessionId = null;
                    loginUser.ActiveDeviceName = null;
                    loginUser.SessionStartedAt = null;
                }

                if (!string.IsNullOrWhiteSpace(newUsername) &&
                    !string.Equals(loginUser.Username, newUsername, StringComparison.Ordinal))
                {
                    if (await db.Users.AnyAsync(u => u.Username == newUsername && u.Id != loginUser.Id, ct))
                        throw new AppException(409, "A login with this username already exists.");
                    loginUser.Username = newUsername;
                }

            if (!string.IsNullOrWhiteSpace(newPassword))
            {
                if (!IsStrongPassword(newPassword))
                    throw new AppException(400, "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character.");

                loginUser.PasswordHash = passwords.HashPassword(loginUser, newPassword);
                passwordResetUserId = loginUser.Id;
            }
            }
        }

        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException)
        {
            throw new AppException(409, "This record was modified by someone else. Reload and retry.");
        }

        // Password changed — revoke all sessions so the employee must sign in again
        // with the new password (mirrors the logout/token purge behavior).
        if (passwordResetUserId is { } resetUserId)
        {
            await db.UserTokens.Where(t => t.UserId == resetUserId).ExecuteDeleteAsync(ct);
        }

        var updateApplyUsernames = await GetUsernamesAsync(new[] { e }, ct);
        var updateLoginNames = await GetLoginUsernamesAsync(new[] { e }, ct);
        return ToResponse(e, updateApplyUsernames, updateLoginNames);
    }

    public async Task DeleteAsync(int id, long? actorId, CancellationToken ct)
    {
        var e = await db.Employees.FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new AppException(404, "Employee not found.");
        e.IsActive = false;                    // soft delete; files are retained for audit
        e.UpdatedBy = actorId;
        e.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task RemoveLoginAsync(int id, CancellationToken ct)
    {
        var e = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new AppException(404, "Employee not found.");

        var user = await db.Users.FirstOrDefaultAsync(
                       u => u.Email != null && u.Email.Trim().ToLower() == e.Email, ct)
                   ?? throw new AppException(404, "No login account found for this employee.");

        // Soft-revoke: deactivate and kill the active session so the user is
        // immediately signed out. We cannot hard-delete because tbl_users.created_by
        // is a self-referential FK with RESTRICT — deleting a row that is referenced
        // as the creator of other rows would violate the constraint.
        user.IsActive = false;
        user.ActiveSessionId = null;
        user.ActiveDeviceName = null;
        user.SessionStartedAt = null;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// True when this employee currently has a usable login account.
    /// RemoveLoginAsync deactivates the user (IsActive = false) without deleting it,
    /// so a revoked login still leaves a row behind — an active one means the
    /// employee can still sign in.
    /// </summary>
    public async Task<bool> HasLoginAsync(int id, CancellationToken ct)
    {
        var e = await db.Employees.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct)
                ?? throw new AppException(404, "Employee not found.");

        return await db.Users.AnyAsync(
            u => u.Email != null && u.Email.Trim().ToLower() == e.Email && u.IsActive, ct);
    }

    /// <summary>
    /// Signup-grade password policy shared by credential creation and password change.
    /// </summary>
    private static bool IsStrongPassword(string password)
    {
        return password.Length >= 8 &&
               password.Any(char.IsUpper) &&
               password.Any(char.IsLower) &&
               password.Any(char.IsDigit) &&
               password.Any(c => !char.IsLetterOrDigit(c));
    }

    private static void Apply(Employee e, EmployeeRequest r)
    {
        e.FirstName = r.FirstName.Trim();
        e.LastName = r.LastName?.Trim();
        e.Email = r.Email.Trim().ToLowerInvariant();
        e.Mobile = r.Mobile;
        e.PanNumber = string.IsNullOrWhiteSpace(r.PanNumber) ? null : r.PanNumber.Trim().ToUpperInvariant();
        e.AadhaarNumber = string.IsNullOrWhiteSpace(r.AadhaarNumber) ? null : r.AadhaarNumber.Trim();
        e.Department = r.Department;
        e.Salary = r.Salary;
        e.DateOfJoining = r.DateOfJoining;
    }

    /// <summary>
    /// Resolves usernames for the audit actor ids (CreatedBy/UpdatedBy) on the given
    /// employee rows so the UI can display "updated by &lt;username&gt;" instead of a raw id.
    /// </summary>
    private async Task<Dictionary<long, string>> GetUsernamesAsync(
        IReadOnlyCollection<Employee> employees, CancellationToken ct)
    {
        var ids = employees
            .SelectMany(e => new[] { e.CreatedBy, e.UpdatedBy })
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();
        if (ids.Count == 0) return new Dictionary<long, string>();

        return await db.Users.AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Username, ct);
    }

    /// <summary>
    /// Resolves the employee's own login username (user whose email matches the
    /// employee) so the UI can prefill it in the Edit Profile credentials card.
    /// </summary>
    private async Task<Dictionary<string, string>> GetLoginUsernamesAsync(
        IReadOnlyCollection<Employee> employees, CancellationToken ct)
    {
        var emails = employees.Select(e => e.Email).Distinct().ToList();
        if (emails.Count == 0) return new Dictionary<string, string>();

        var users = await db.Users.AsNoTracking()
            .Where(u => u.Email != null && emails.Contains(u.Email.Trim().ToLower()))
            .Select(u => new { Email = u.Email!.Trim().ToLower(), u.Username, u.IsActive, u.Id })
            .ToListAsync(ct);
        // Legacy accounts may differ only by email casing/whitespace. Prefer an active
        // account and keep one deterministic username per normalized email so paging
        // cannot fail when duplicate legacy rows are included together.
        return users
            .GroupBy(u => u.Email)
            .ToDictionary(
                group => group.Key,
                group => group.OrderByDescending(u => u.IsActive).ThenBy(u => u.Id).First().Username);
    }

    private static EmployeeResponse ToResponse(
        Employee e,
        IReadOnlyDictionary<long, string> usernames,
        IReadOnlyDictionary<string, string> loginUsernames) => new(
        e.Id, e.FirstName, e.LastName, e.Email, e.Mobile,
        e.PanNumber is { Length: 10 } p ? $"{p[..5]}****{p[9]}" : null,
        e.AadhaarNumber is { Length: 12 } a ? $"XXXX XXXX {a[^4..]}" : (e.AadhaarNumber is { Length: >= 4 } ? $"XXXX XXXX {e.AadhaarNumber[^4..]}" : e.AadhaarNumber),
        e.Department, e.Salary, e.DateOfJoining, e.IsActive, e.CreatedAt, e.Version,
        e.Documents.Select(d => new DocumentResponse(d.Id, d.DocumentType, d.OriginalFileName,
            d.ContentType, d.SizeBytes, d.UploadedAt)).ToList(),
        e.PanNumber,
        e.AadhaarNumber,
        e.CreatedBy,
        e.UpdatedAt,
        e.UpdatedBy,
        e.CreatedBy is { } createdById && usernames.TryGetValue(createdById, out var createdByUsername) ? createdByUsername : null,
        e.UpdatedBy is { } updatedById && usernames.TryGetValue(updatedById, out var updatedByUsername) ? updatedByUsername : null,
        loginUsernames.TryGetValue(e.Email, out var loginUsername) ? loginUsername : null);
}
