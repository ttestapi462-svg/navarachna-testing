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

        _container.CreateIfNotExists(PublicAccessType.None);
    }

    public async Task<string> SaveAsync(Stream content, string extension, CancellationToken ct)
    {
        var name = $"{DateTime.UtcNow:yyyy}/{DateTime.UtcNow:MM}/{Guid.NewGuid():N}{extension}";
        await _container.GetBlobClient(name).UploadAsync(content, overwrite: false, cancellationToken: ct);
        return name;
    }

    public async Task<Stream> OpenAsync(string relativePath, CancellationToken ct) =>
        await _container.GetBlobClient(relativePath.Replace('\\', '/'))
                        .OpenReadAsync(cancellationToken: ct);

    public async Task DeleteAsync(string relativePath, CancellationToken ct) =>
        await _container.GetBlobClient(relativePath.Replace('\\', '/'))
                        .DeleteIfExistsAsync(cancellationToken: ct);
}