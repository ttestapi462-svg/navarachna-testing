using Azure.Identity;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace EmployeeApi.Services;

/// <summary>
/// Stores documents in a PRIVATE Azure Blob container.
/// Config: Storage:Blob:Container, and EITHER Storage:Blob:ConnectionString
/// OR Storage:Blob:AccountUrl (uses managed identity / DefaultAzureCredential).
/// </summary>
public class BlobFileStorage : IFileStorage
{
    private readonly BlobContainerClient _container;

    public BlobFileStorage(IConfiguration cfg)
    {
        var containerName = cfg["Storage:Blob:Container"] ?? "hr-documents";
        var conn = cfg["Storage:Blob:ConnectionString"];
        var accountUrl = cfg["Storage:Blob:AccountUrl"];

        if (!string.IsNullOrWhiteSpace(conn))
            _container = new BlobContainerClient(conn, containerName);
        else if (!string.IsNullOrWhiteSpace(accountUrl))
            _container = new BlobContainerClient(
                new Uri($"{accountUrl.TrimEnd('/')}/{containerName}"), new DefaultAzureCredential());
        else
            throw new InvalidOperationException(
                "Blob storage is enabled but neither Storage:Blob:ConnectionString nor Storage:Blob:AccountUrl is set.");

        try
        {
            _container.CreateIfNotExists(PublicAccessType.None);
        }
        catch (Azure.RequestFailedException ex) when (ex.Status is 403 or 409)
        {
            // Container already exists, or account policy / credentials do not permit creating/inspecting container permissions
        }
    }

    public async Task<string> SaveAsync(Stream content, string fileNamePrefix, string extension, CancellationToken ct)
    {
        // Sanitise: replace characters that are valid in blob names but messy in URLs / file explorers
        var safeName = SanitiseName(fileNamePrefix);
        var name = $"{DateTime.UtcNow:yyyy}/{DateTime.UtcNow:MM}/{safeName}{extension}";
        var blobClient = _container.GetBlobClient(name);

        var contentType = extension.ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            _ => "application/octet-stream"
        };

        var options = new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = contentType }
        };

        await blobClient.UploadAsync(content, options, cancellationToken: ct);
        return name;
    }

    private static string SanitiseName(string name)
    {
        // Allow letters, digits, hyphens, underscores. Replace everything else with '_'.
        var chars = name.Select(c => char.IsLetterOrDigit(c) || c == '-' || c == '_' ? c : '_');
        var sanitised = string.Concat(chars);
        return string.IsNullOrWhiteSpace(sanitised) ? Guid.NewGuid().ToString("N") : sanitised;
    }

    public async Task<Stream> OpenAsync(string relativePath, CancellationToken ct) =>
        await _container.GetBlobClient(relativePath.Replace('\\', '/'))
                        .OpenReadAsync(cancellationToken: ct);

    public async Task DeleteAsync(string relativePath, CancellationToken ct) =>
        await _container.GetBlobClient(relativePath.Replace('\\', '/'))
                        .DeleteIfExistsAsync(cancellationToken: ct);
}