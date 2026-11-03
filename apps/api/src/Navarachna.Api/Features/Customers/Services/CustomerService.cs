using Microsoft.EntityFrameworkCore;
using Navarachna.Api.Data;
using Navarachna.Api.Entities;
using Navarachna.Api.Features.Customers.DTOs;

namespace Navarachna.Api.Features.Customers.Services;

public class CustomerService : ICustomerService
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<CustomerService> _logger;

    public CustomerService(AppDbContext dbContext, ILogger<CustomerService> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<(IEnumerable<CustomerDto> Data, long TotalCount)> GetCustomersAsync(
        long? id = null,
        string? mobile = null,
        string? search = null,
        bool? isActive = null,
        int pageNumber = 1,
        int pageSize = 10)
    {
        var query = _dbContext.Customers.AsNoTracking().AsQueryable();

        if (id.HasValue && id.Value > 0)
        {
            query = query.Where(c => c.Id == id.Value);
        }

        if (!string.IsNullOrWhiteSpace(mobile))
        {
            query = query.Where(c => c.MobileNumber.Contains(mobile.Trim()));
        }

        if (isActive.HasValue)
        {
            query = query.Where(c => c.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(c =>
                EF.Functions.ILike(c.Name, $"%{s}%") ||
                EF.Functions.ILike(c.MobileNumber, $"%{s}%") ||
                (c.City != null && EF.Functions.ILike(c.City, $"%{s}%")) ||
                (c.Area != null && EF.Functions.ILike(c.Area, $"%{s}%")));
        }

        var totalCount = await query.LongCountAsync();

        if (pageNumber < 1) pageNumber = 1;
        if (pageSize < 1) pageSize = 10;

        var rawItems = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var userIds = rawItems
            .SelectMany(c => new[] { c.CreatedBy, c.UpdatedBy })
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        var usernames = userIds.Count > 0
            ? await _dbContext.Users.AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => string.IsNullOrWhiteSpace(u.Username) ? $"{u.FirstName} {u.LastName}".Trim() : u.Username)
            : new Dictionary<long, string>();

        var items = rawItems.Select(c => new CustomerDto
        {
            Id = c.Id,
            Name = c.Name,
            MobileNumber = c.MobileNumber,
            WhatsappNumber = c.WhatsappNumber,
            AlternateMobile = c.AlternateMobile,
            Address = c.Address,
            Area = c.Area,
            City = c.City,
            Remarks = c.Remarks,
            ProfilePhotoUrl = c.ProfilePhotoUrl,
            IsActive = c.IsActive,
            CreatedAt = c.CreatedAt,
            CreatedBy = c.CreatedBy,
            CreatedByUsername = c.CreatedBy.HasValue && usernames.TryGetValue(c.CreatedBy.Value, out var cu) ? cu : null,
            UpdatedAt = c.UpdatedAt,
            UpdatedBy = c.UpdatedBy,
            UpdatedByUsername = c.UpdatedBy.HasValue && usernames.TryGetValue(c.UpdatedBy.Value, out var uu) ? uu : null
        }).ToList();

        return (items, totalCount);
    }

    public async Task<CustomerDto?> GetCustomerByIdAsync(long id)
    {
        var customer = await _dbContext.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
        if (customer == null) return null;

        string? createdByName = null;
        if (customer.CreatedBy.HasValue)
        {
            var u = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == customer.CreatedBy.Value);
            createdByName = u?.Username ?? (u != null ? $"{u.FirstName} {u.LastName}".Trim() : null);
        }

        string? updatedByName = null;
        if (customer.UpdatedBy.HasValue)
        {
            var u = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == customer.UpdatedBy.Value);
            updatedByName = u?.Username ?? (u != null ? $"{u.FirstName} {u.LastName}".Trim() : null);
        }

        return new CustomerDto
        {
            Id = customer.Id,
            Name = customer.Name,
            MobileNumber = customer.MobileNumber,
            WhatsappNumber = customer.WhatsappNumber,
            AlternateMobile = customer.AlternateMobile,
            Address = customer.Address,
            Area = customer.Area,
            City = customer.City,
            Remarks = customer.Remarks,
            ProfilePhotoUrl = customer.ProfilePhotoUrl,
            IsActive = customer.IsActive,
            CreatedAt = customer.CreatedAt,
            CreatedBy = customer.CreatedBy,
            CreatedByUsername = createdByName,
            UpdatedAt = customer.UpdatedAt,
            UpdatedBy = customer.UpdatedBy,
            UpdatedByUsername = updatedByName
        };
    }

    public async Task<CustomerSummaryDto?> GetCustomerSummaryAsync(long id)
    {
        var exists = await _dbContext.Customers.AsNoTracking().AnyAsync(c => c.Id == id);
        if (!exists) return null;

        // If tbl_orders is added later, aggregations will query tbl_orders.
        // For now, return real summary structure matching Tailoring's format.
        return new CustomerSummaryDto
        {
            CustomerId = id,
            TotalOrders = 0,
            TotalBusinessValue = 0.00m,
            TotalPaid = 0.00m,
            OutstandingBalance = 0.00m
        };
    }

    public async Task<long> CreateCustomerAsync(CustomerCreateDto dto)
    {
        // Business Logic: If WhatsApp is not provided, default to Mobile Number
        var whatsapp = string.IsNullOrWhiteSpace(dto.WhatsappNumber) ? dto.MobileNumber : dto.WhatsappNumber;

        var customer = new Customer
        {
            Name = dto.Name.Trim(),
            MobileNumber = dto.MobileNumber.Trim(),
            WhatsappNumber = whatsapp.Trim(),
            AlternateMobile = dto.AlternateMobile?.Trim(),
            Address = dto.Address?.Trim(),
            Area = dto.Area?.Trim(),
            City = dto.City?.Trim(),
            Remarks = dto.Remarks?.Trim(),
            ProfilePhotoUrl = dto.ProfilePhotoUrl?.Trim(),
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = 1,
            UpdatedAt = DateTime.UtcNow,
            UpdatedBy = 1
        };

        _dbContext.Customers.Add(customer);
        await _dbContext.SaveChangesAsync();

        return customer.Id;
    }

    public async Task<bool> UpdateCustomerAsync(long id, CustomerCreateDto dto)
    {
        var customer = await _dbContext.Customers.FirstOrDefaultAsync(c => c.Id == id);
        if (customer == null) return false;

        var whatsapp = string.IsNullOrWhiteSpace(dto.WhatsappNumber) ? dto.MobileNumber : dto.WhatsappNumber;

        customer.Name = dto.Name.Trim();
        customer.MobileNumber = dto.MobileNumber.Trim();
        customer.WhatsappNumber = whatsapp.Trim();
        customer.AlternateMobile = dto.AlternateMobile?.Trim();
        customer.Address = dto.Address?.Trim();
        customer.Area = dto.Area?.Trim();
        customer.City = dto.City?.Trim();
        customer.Remarks = dto.Remarks?.Trim();
        customer.ProfilePhotoUrl = dto.ProfilePhotoUrl?.Trim();
        customer.IsActive = dto.IsActive;
        customer.UpdatedAt = DateTime.UtcNow;
        customer.UpdatedBy = 1;

        await _dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteCustomerAsync(long id)
    {
        var customer = await _dbContext.Customers.FirstOrDefaultAsync(c => c.Id == id);
        if (customer == null) return false;

        _dbContext.Customers.Remove(customer);
        await _dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<List<CustomerPaymentDto>> GetCustomerPaymentsAsync(long customerId)
    {
        // When payment records are inserted, this queries them.
        return await Task.FromResult(new List<CustomerPaymentDto>());
    }

    public async Task<List<CustomerReferenceClothDto>> GetCustomerReferenceClothsAsync(long customerId)
    {
        return await _dbContext.ReferenceCloths
            .AsNoTracking()
            .Where(rc => rc.CustomerId == customerId)
            .OrderByDescending(rc => rc.CreatedAt)
            .Select(rc => new CustomerReferenceClothDto
            {
                Id = rc.Id,
                OrderId = rc.OrderId,
                OrderNumber = rc.OrderNumber,
                CustomerId = rc.CustomerId,
                ItemName = rc.ItemName,
                StatusId = rc.StatusId,
                StatusName = rc.StatusName,
                ReceivedDate = rc.ReceivedDate,
                ReturnedDate = rc.ReturnedDate,
                Remarks = rc.Remarks,
                CreatedAt = rc.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<List<CustomerMeasurementDto>> GetCustomerMeasurementsAsync(long customerId, long? dressTypeId = null)
    {
        // When measurement records are linked to orders, this queries them.
        return await Task.FromResult(new List<CustomerMeasurementDto>());
    }
}
