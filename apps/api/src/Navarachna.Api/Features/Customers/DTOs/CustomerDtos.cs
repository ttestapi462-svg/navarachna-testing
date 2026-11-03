using System.ComponentModel.DataAnnotations;

namespace Navarachna.Api.Features.Customers.DTOs;

public class CustomerDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public string? WhatsappNumber { get; set; }
    public string? AlternateMobile { get; set; }
    public string? Address { get; set; }
    public string? Area { get; set; }
    public string? City { get; set; }
    public string? Remarks { get; set; }
    public string? ProfilePhotoUrl { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public long? CreatedBy { get; set; }
    public string? CreatedByUsername { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public long? UpdatedBy { get; set; }
    public string? UpdatedByUsername { get; set; }
}

public class CustomerCreateDto
{
    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(15)]
    public string MobileNumber { get; set; } = string.Empty;

    [MaxLength(15)]
    public string? WhatsappNumber { get; set; }

    [MaxLength(15)]
    public string? AlternateMobile { get; set; }

    public string? Address { get; set; }

    [MaxLength(100)]
    public string? Area { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }

    public string? Remarks { get; set; }

    [MaxLength(500)]
    public string? ProfilePhotoUrl { get; set; }

    public bool IsActive { get; set; } = true;
}

public class CustomerSummaryDto
{
    public long CustomerId { get; set; }
    public long TotalOrders { get; set; }
    public decimal TotalBusinessValue { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal OutstandingBalance { get; set; }
}

public class CustomerReferenceClothDto
{
    public long Id { get; set; }
    public long? OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public long CustomerId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public long? StatusId { get; set; }
    public string? StatusName { get; set; }
    public DateOnly? ReceivedDate { get; set; }
    public DateOnly? ReturnedDate { get; set; }
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CustomerPaymentDto
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public string PaymentMethod { get; set; } = "Cash";
    public string? ReferenceNumber { get; set; }
    public string? ReceiptPhotoUrl { get; set; }
    public string? Remarks { get; set; }
}

public class CustomerMeasurementDto
{
    public long Id { get; set; }
    public long? OrderItemId { get; set; }
    public string? OrderNumber { get; set; }
    public long? DressTypeId { get; set; }
    public string? DressTypeName { get; set; }
    public string? PresetSize { get; set; }
    public string? DynamicValues { get; set; }
    public string? SpecialInstructions { get; set; }
    public string? ReferenceClothDetails { get; set; }
    public string? MeasurementPhotoUrl { get; set; }
    public string? DesignPhotoUrl { get; set; }
    public DateTime CreatedAt { get; set; }
}
