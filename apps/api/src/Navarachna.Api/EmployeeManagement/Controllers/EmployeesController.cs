using EmployeeApi.Models;
using EmployeeApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EmployeeApi.Controllers;

[ApiController]
[Route("api/v1/employees")]
[Authorize]
public class EmployeesController(EmployeeService svc) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<EmployeeResponse>>> List(
        string? search, string? department, int page = 1, int pageSize = 20, CancellationToken ct = default)
        => Ok(await svc.ListAsync(search, department, page, pageSize, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EmployeeResponse>> Get(int id, CancellationToken ct)
        => Ok(await svc.GetAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<EmployeeResponse>> Create(EmployeeRequest r, CancellationToken ct)
    {
        var actorId = long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : (long?)null;
        var created = await svc.CreateAsync(r, actorId, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<EmployeeResponse>> Update(int id, EmployeeRequest r, CancellationToken ct)
    {
        var actorId = long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : (long?)null;
        return Ok(await svc.UpdateAsync(id, r, actorId, ct));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var actorId = long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : (long?)null;
        await svc.DeleteAsync(id, actorId, ct);
        return NoContent();
    }

    [HttpGet("{id:int}/login")]
    public async Task<IActionResult> GetLoginStatus(int id, CancellationToken ct)
        => Ok(new { hasLogin = await svc.HasLoginAsync(id, ct) });

    [HttpDelete("{id:int}/login")]
    public async Task<IActionResult> RemoveLogin(int id, CancellationToken ct)
    {
        await svc.RemoveLoginAsync(id, ct);
        return NoContent();
    }
}