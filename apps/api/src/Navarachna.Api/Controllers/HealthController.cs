using Microsoft.AspNetCore.Mvc;

namespace Navarachna.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "Healthy",
            service = "Navarachna.Api",
            framework = ".NET 10",
            timestamp = DateTime.UtcNow
        });
    }
}
