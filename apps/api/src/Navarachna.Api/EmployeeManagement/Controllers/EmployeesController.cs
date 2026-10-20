using EmployeeApi.Models;
using EmployeeApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
        var created = await svc.CreateAsync(r, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<EmployeeResponse>> Update(int id, EmployeeRequest r, CancellationToken ct)
        => Ok(await svc.UpdateAsync(id, r, ct));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await svc.DeleteAsync(id, ct);
        return NoContent();
    }
}