using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Navarachna.Api.Features.Expenses;

namespace Navarachna.Api.Controllers;

// TEMPORARILY OPEN: no login or role is required for any endpoint.
// TODO (role-based access later): add [Authorize] on the class, and per action e.g.
//   [Authorize(Roles = "Admin")] on Update / Delete.
// This also needs a Role column on tbl_users and a ClaimTypes.Role claim in TokenService.
// If a valid login token is sent, created_by / updated_by / deleted_by are still recorded; otherwise they stay null.
[ApiController]
[Route("api/expenses")]
public class ExpensesController(ExpenseService service) : ControllerBase
{
    private const int MaxRequestBytes = 6 * 1024 * 1024; // bill (5 MB) + form fields

    // Same claim AuthController uses for the user id. Null when the caller is not logged in.
    private long? CurrentUserId =>
        long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    /// <summary>Create an expense.</summary>
    [HttpGet("sourcing-specialists")]
    [ProducesResponseType(typeof(IReadOnlyList<SourcingSpecialistResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSourcingSpecialists(CancellationToken ct) =>
        Ok(await service.GetActiveSourcingSpecialistsAsync(ct));

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxRequestBytes)]
    [ProducesResponseType(typeof(ExpenseResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromForm] ExpenseForm form, CancellationToken ct)
    {
        var errors = await ExpenseValidator.ValidateFormAsync(form, billRequired: true);
        foreach (var (key, messages) in await service.ValidateSourcingSpecialistsAsync(form.SourcingSpecialistIds, ct))
            errors[key] = messages;
        if (errors.Count > 0) return ValidationProblem(new ValidationProblemDetails(errors));

        var created = await service.CreateAsync(form, CurrentUserId, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>List expenses with optional date range / text search and paging.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<ExpenseResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] ExpenseQuery query, CancellationToken ct)
    {
        var errors = ExpenseValidator.ValidateQuery(query);
        if (errors.Count > 0) return ValidationProblem(new ValidationProblemDetails(errors));

        return Ok(await service.ListAsync(query, ct));
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(ExpenseResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id, CancellationToken ct)
    {
        var expense = await service.GetAsync(id, ct);
        return expense is null ? NotFound() : Ok(expense);
    }

    /// <summary>Download or view the bill photo/copy.</summary>
    [HttpGet("{id:long}/bill")]
    public async Task<IActionResult> GetBill(long id, CancellationToken ct)
    {
        var bill = await service.GetBillAsync(id, ct);
        if (bill is null) return NotFound();

        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(bill.Value.Stream, bill.Value.ContentType);
    }

    /// <summary>Edit an expense. Bill is optional; send it only to replace the existing one.</summary>
    [HttpPut("{id:long}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxRequestBytes)]
    [ProducesResponseType(typeof(ExpenseResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromForm] ExpenseForm form, CancellationToken ct)
    {
        var errors = await ExpenseValidator.ValidateFormAsync(form, billRequired: false);
        foreach (var (key, messages) in await service.ValidateSourcingSpecialistsAsync(form.SourcingSpecialistIds, ct))
            errors[key] = messages;
        if (errors.Count > 0) return ValidationProblem(new ValidationProblemDetails(errors));

        var updated = await service.UpdateAsync(id, form, CurrentUserId, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    /// <summary>Delete an expense (soft delete) and return a result message.</summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        if (id <= 0)
        {
            return BadRequest(new
            {
                success = false,
                message = "Invalid expense ID."
            });
        }

        var deleted = await service.DeleteAsync(id, CurrentUserId, ct);
        if (!deleted)
        {
            return NotFound(new
            {
                success = false,
                message = $"Expense with ID {id} was not found."
            });
        }

        return Ok(new
        {
            success = true,
            message = "Expense deleted successfully.",
            id
        });
    }
}
