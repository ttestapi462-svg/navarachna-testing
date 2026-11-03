using Navarachna.Api.Features.Customers.DTOs;

namespace Navarachna.Api.Features.Customers.Services;

public interface ICustomerService
{
    Task<(IEnumerable<CustomerDto> Data, long TotalCount)> GetCustomersAsync(
        long? id = null,
        string? mobile = null,
        string? search = null,
        bool? isActive = null,
        int pageNumber = 1,
        int pageSize = 10);

    Task<CustomerDto?> GetCustomerByIdAsync(long id);
    Task<CustomerSummaryDto?> GetCustomerSummaryAsync(long id);
    Task<long> CreateCustomerAsync(CustomerCreateDto customerDto);
    Task<bool> UpdateCustomerAsync(long id, CustomerCreateDto customerDto);
    Task<bool> DeleteCustomerAsync(long id);
    Task<List<CustomerPaymentDto>> GetCustomerPaymentsAsync(long customerId);
    Task<List<CustomerReferenceClothDto>> GetCustomerReferenceClothsAsync(long customerId);
    Task<List<CustomerMeasurementDto>> GetCustomerMeasurementsAsync(long customerId, long? dressTypeId = null);
}
