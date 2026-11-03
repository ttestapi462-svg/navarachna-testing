using Microsoft.AspNetCore.Mvc;
using Navarachna.Api.Features.Customers.DTOs;
using Navarachna.Api.Features.Customers.Services;

namespace Navarachna.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _customerService;
    private readonly ILogger<CustomersController> _logger;

    public CustomersController(ICustomerService customerService, ILogger<CustomersController> logger)
    {
        _customerService = customerService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetCustomers(
        [FromQuery] long? id,
        [FromQuery] string? mobile,
        [FromQuery] string? search,
        [FromQuery] bool? isActive,
        [FromQuery] int page = 1,
        [FromQuery] int? pageNumber = null,
        [FromQuery] int pageSize = 10)
    {
        int currentPage = pageNumber ?? page;
        if (currentPage < 1) currentPage = 1;
        if (pageSize < 1) pageSize = 10;

        var result = await _customerService.GetCustomersAsync(id, mobile, search, isActive, currentPage, pageSize);

        int totalPages = pageSize > 0 ? (int)Math.Ceiling((double)result.TotalCount / pageSize) : 1;
        bool hasMore = (currentPage * pageSize) < result.TotalCount;

        return Ok(new
        {
            data = result.Data,
            items = result.Data,
            totalCount = result.TotalCount,
            page = currentPage,
            pageNumber = currentPage,
            pageSize,
            totalPages,
            hasMore
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCustomerById(long id)
    {
        var customer = await _customerService.GetCustomerByIdAsync(id);
        if (customer == null)
        {
            return NotFound(new { message = "Customer not found" });
        }

        return Ok(customer);
    }

    [HttpGet("{id}/summary")]
    public async Task<IActionResult> GetCustomerSummary(long id)
    {
        var summary = await _customerService.GetCustomerSummaryAsync(id);
        if (summary == null)
        {
            return NotFound(new { message = "Customer not found" });
        }

        return Ok(summary);
    }

    [HttpPost]
    public async Task<IActionResult> CreateCustomer([FromBody] CustomerCreateDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var newId = await _customerService.CreateCustomerAsync(dto);
            return CreatedAtAction(nameof(GetCustomerById), new { id = newId }, new { id = newId, message = "Customer created successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating customer.");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCustomer(long id, [FromBody] CustomerCreateDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var updated = await _customerService.UpdateCustomerAsync(id, dto);
            if (!updated)
            {
                return NotFound(new { message = "Customer not found" });
            }

            return Ok(new { message = "Customer updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating customer {CustomerId}.", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCustomer(long id)
    {
        try
        {
            var deleted = await _customerService.DeleteCustomerAsync(id);
            if (!deleted)
            {
                return NotFound(new { message = "Customer not found" });
            }

            return Ok(new { message = "Customer deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting customer {CustomerId}.", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id}/payments")]
    public async Task<IActionResult> GetCustomerPayments(long id)
    {
        var payments = await _customerService.GetCustomerPaymentsAsync(id);
        return Ok(new { items = payments });
    }

    [HttpGet("{id}/reference-cloths")]
    public async Task<IActionResult> GetCustomerReferenceCloths(long id)
    {
        var cloths = await _customerService.GetCustomerReferenceClothsAsync(id);
        return Ok(new { items = cloths });
    }

    [HttpGet("{id}/measurements")]
    public async Task<IActionResult> GetCustomerMeasurements(long id, [FromQuery] long? dressTypeId = null)
    {
        var measurements = await _customerService.GetCustomerMeasurementsAsync(id, dressTypeId);
        return Ok(measurements);
    }
}
