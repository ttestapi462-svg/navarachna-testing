using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace Navarachna.Api.Features.Expenses;

public record StoredBill(string BlobName, string FileName, string ContentType);

/// <summary>Thrown when Azure Blob Storage cannot be reached. Mapped to HTTP 503 by GlobalExceptionHandler.</summary>
public class BillStorageUnavailableException(Exception inner)
    : Exception("Bill storage is unavailable.", inner);

public interface IBillStorage
{
    Task<StoredBill> UploadAsync(IFormFile file, CancellationToken ct);
    Task<Stream?> OpenReadAsync(string blobName, CancellationToken ct);
    Task DeleteAsync(string blobName, CancellationToken ct);
}

public class AzureBillStorage(BlobServiceClient service, IConfiguration config) : IBillStorage
{
    private readonly BlobContainerClient _container =
        service.GetBlobContainerClient(config["Azure:Storage:Container"] ?? "expense-bills");

    public async Task<StoredBill> UploadAsync(IFormFile file, CancellationToken ct)
    {
        try
        {
            await _container.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: ct);
        }
        catch (Exception ex) when (ex is Azure.RequestFailedException or AggregateException)
        {
            throw new BillStorageUnavailableException(ex);
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var contentType = BillFileRules.ContentTypes[ext];
        var now = DateTime.UtcNow;
        var blobName = $"{now:yyyy}/{now:MM}/{Guid.NewGuid():N}{ext}";

        await using var stream = file.OpenReadStream();
        await _container.GetBlobClient(blobName).UploadAsync(
            stream, new BlobHttpHeaders { ContentType = contentType }, cancellationToken: ct);

        // Strip any path parts from the client-supplied name
        var safeName = Path.GetFileName(file.FileName);
        if (safeName.Length > 255) safeName = safeName[^255..];
        return new StoredBill(blobName, safeName, contentType);
    }

    public async Task<Stream?> OpenReadAsync(string blobName, CancellationToken ct)
    {
        var blob = _container.GetBlobClient(blobName);
        if (!await blob.ExistsAsync(ct)) return null;
        return await blob.OpenReadAsync(cancellationToken: ct);
    }

    public Task DeleteAsync(string blobName, CancellationToken ct) =>
        _container.GetBlobClient(blobName).DeleteIfExistsAsync(cancellationToken: ct);
}
