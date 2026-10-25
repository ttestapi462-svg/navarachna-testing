namespace Navarachna.Api.Features.Expenses;

public static class BillFileRules
{
    public const long MaxBytes = 5 * 1024 * 1024; // 5 MB

    public static readonly IReadOnlyDictionary<string, string> ContentTypes =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".png"] = "image/png",
            [".webp"] = "image/webp",
            [".pdf"] = "application/pdf"
        };
}

public static class ExpenseValidator
{
    private const decimal MaxAmount = 9_999_999.99m;

    // Studio operates in IST; used for the "no future date" rule.
    public static DateOnly TodayIst() => DateOnly.FromDateTime(DateTime.UtcNow.AddMinutes(330));

    public static async Task<Dictionary<string, string[]>> ValidateFormAsync(ExpenseForm f, bool billRequired)
    {
        var errors = new Dictionary<string, List<string>>();
        void Add(string key, string msg)
        {
            if (!errors.TryGetValue(key, out var list)) errors[key] = list = new();
            list.Add(msg);
        }

        // Expense date
        if (f.ExpenseDate is null) Add("expenseDate", "Expense date is required (yyyy-MM-dd).");
        else if (f.ExpenseDate > TodayIst()) Add("expenseDate", "Expense date cannot be in the future.");
        else if (f.ExpenseDate < new DateOnly(2000, 1, 1)) Add("expenseDate", "Expense date is not valid.");

        // Amount
        if (f.Amount is null) Add("amount", "Amount is required.");
        else
        {
            if (f.Amount <= 0) Add("amount", "Amount must be greater than 0.");
            if (f.Amount > MaxAmount) Add("amount", $"Amount cannot exceed {MaxAmount:N2}.");
            if (decimal.Round(f.Amount.Value, 2) != f.Amount) Add("amount", "Amount can have at most 2 decimal places.");
        }

        // Category / notes (single field, max 250 characters)
        var text = f.CategoryNotes?.Trim();
        if (!string.IsNullOrEmpty(text) && text.Length is < 2 or > 250)
            Add("categoryNotes", "Category/notes must be 2 to 250 characters.");

        if (f.SourcingSpecialistIds is null || f.SourcingSpecialistIds.Count == 0)
            Add("sourcingSpecialistIds", "Select at least one Sourcing Specialist.");
        else if (f.SourcingSpecialistIds.Any(id => id <= 0))
            Add("sourcingSpecialistIds", "Sourcing Specialist selection is invalid.");

        // Bill photo / copy
        if (f.Bill is null)
        {
            if (billRequired) Add("bill", "Bill photo or copy is required.");
        }
        else
        {
            var ext = Path.GetExtension(f.Bill.FileName);
            if (f.Bill.Length == 0) Add("bill", "Bill file is empty.");
            else if (f.Bill.Length > BillFileRules.MaxBytes) Add("bill", "Bill file cannot exceed 5 MB.");
            else if (!BillFileRules.ContentTypes.ContainsKey(ext))
                Add("bill", "Bill must be a JPG, JPEG, PNG, WEBP or PDF file.");
            else if (!await SignatureMatchesAsync(f.Bill, ext))
                Add("bill", "Bill file content does not match its file type.");
        }

        return errors.ToDictionary(k => k.Key, v => v.Value.ToArray());
    }

    public static Dictionary<string, string[]> ValidateQuery(ExpenseQuery q)
    {
        var errors = new Dictionary<string, string[]>();
        if (q.Page < 1) errors["page"] = ["Page must be 1 or greater."];
        if (q.PageSize is < 1 or > 100) errors["pageSize"] = ["Page size must be between 1 and 100."];
        if (q.FromDate is not null && q.ToDate is not null && q.FromDate > q.ToDate)
            errors["fromDate"] = ["fromDate cannot be after toDate."];
        return errors;
    }

    // Checks the real file header, not just the extension.
    private static async Task<bool> SignatureMatchesAsync(IFormFile file, string ext)
    {
        var buf = new byte[12];
        await using var s = file.OpenReadStream();
        var n = await s.ReadAtLeastAsync(buf, buf.Length, throwOnEndOfStream: false);
        if (n < 4) return false;

        return ext.ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => buf[0] == 0xFF && buf[1] == 0xD8 && buf[2] == 0xFF,
            ".png" => buf[0] == 0x89 && buf[1] == 0x50 && buf[2] == 0x4E && buf[3] == 0x47,
            ".pdf" => buf[0] == 0x25 && buf[1] == 0x50 && buf[2] == 0x44 && buf[3] == 0x46,
            ".webp" => n >= 12 && buf[0] == 'R' && buf[1] == 'I' && buf[2] == 'F' && buf[3] == 'F'
                              && buf[8] == 'W' && buf[9] == 'E' && buf[10] == 'B' && buf[11] == 'P',
            _ => false
        };
    }
}
