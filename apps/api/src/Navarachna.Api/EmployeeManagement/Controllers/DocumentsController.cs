using EmployeeApi.Models;
using EmployeeApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EmployeeApi.Controllers;

[ApiController]
[Route("api/v1/employees/{employeeId:int}/documents")]
[Authorize]
public class DocumentsController(DocumentService svc) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(6 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<DocumentResponse>> Upload(
        int employeeId, [FromForm] DocumentType documentType, IFormFile file, CancellationToken ct)
        => Ok(await svc.UploadAsync(employeeId, documentType, file, User.Identity?.Name, ct));

    [HttpGet]
    public async Task<ActionResult<List<DocumentResponse>>> List(int employeeId, CancellationToken ct)
        => Ok(await svc.ListAsync(employeeId, ct));

    [HttpGet("{docId:int}/download")]
    public async Task<IActionResult> Download(int employeeId, int docId, CancellationToken ct)
    {
        var (stream, contentType, name) = await svc.DownloadAsync(employeeId, docId, ct);
        Response.Headers.XContentTypeOptions = "nosniff";
        return File(stream, contentType, name);
    }

    [HttpDelete("{docId:int}")]
    public async Task<IActionResult> Delete(int employeeId, int docId, CancellationToken ct)
    {
        await svc.DeleteAsync(employeeId, docId, ct);
        return NoContent();
    }
}