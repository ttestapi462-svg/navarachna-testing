namespace Navarachna.Api.Features.Expenses;

/// <summary>multipart/form-data body for create and update. Nullable so missing values reach our own validator.</summary>
public class ExpenseForm
{
    public DateOnly? ExpenseDate { get; set; }
    public decimal? Amount { get; set; }
    public string? CategoryNotes { get; set; }
    public List<int> SourcingSpecialistIds { get; set; } = [];
    public IFormFile? Bill { get; set; }
}

public class ExpenseQuery
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public string? Search { get; set; } // matches text inside category/notes
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public record ExpenseResponse(
    long Id,
    DateOnly ExpenseDate,
    decimal Amount,
    string CategoryNotes,
    IReadOnlyList<SourcingSpecialistResponse> SourcingSpecialists,
    string BillFileName,
    string BillUrl,
    long? CreatedBy,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record SourcingSpecialistResponse(int Id, string FirstName, string? LastName, string DisplayName);

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);
