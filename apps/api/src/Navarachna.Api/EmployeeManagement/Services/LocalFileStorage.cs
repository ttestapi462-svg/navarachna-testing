namespace EmployeeApi.Services;

public interface IFileStorage
{
    /// <param name="fileNamePrefix">Caller-supplied descriptive prefix (e.g. "XXXX1234-2024-01-15-42").
    /// A sanitised form of this becomes the actual file name inside the dated virtual folder.</param>
    Task<string> SaveAsync(Stream content, string fileNamePrefix, string extension, CancellationToken ct);
    Task<Stream> OpenAsync(string relativePath, CancellationToken ct);
    Task DeleteAsync(string relativePath, CancellationToken ct);
}

public class LocalFileStorage(IConfiguration cfg) : IFileStorage
{
    // Keep this OUTSIDE wwwroot. Used when Storage:Provider is not "Blob".
    private readonly string _root = GetSafeRoot(cfg["Storage:Root"]);

    private static string GetSafeRoot(string? configuredRoot)
    {
        if (string.IsNullOrWhiteSpace(configuredRoot))
            return Path.Combine(AppContext.BaseDirectory, "uploads");

        try
        {
            var rootDir = Path.GetPathRoot(configuredRoot);
            if (!string.IsNullOrEmpty(rootDir) && !Directory.Exists(rootDir))
            {
                return Path.Combine(AppContext.BaseDirectory, "uploads");
            }
            return Path.IsPathRooted(configuredRoot)
                ? configuredRoot
                : Path.Combine(AppContext.BaseDirectory, configuredRoot);
        }
        catch
        {
            return Path.Combine(AppContext.BaseDirectory, "uploads");
        }
    }

    public async Task<string> SaveAsync(Stream content, string fileNamePrefix, string extension, CancellationToken ct)
    {
        // Sanitise the prefix so it is safe on every OS file system
        var safeName = SanitiseName(fileNamePrefix);
        var rel = Path.Combine(DateTime.UtcNow.ToString("yyyy"), DateTime.UtcNow.ToString("MM"),
                               $"{safeName}{extension}");
        var full = Path.Combine(_root, rel);
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        await using var fs = File.Create(full);
        await content.CopyToAsync(fs, ct);
        return rel;
    }

    private static string SanitiseName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var sanitised = string.Concat(name.Select(c => invalid.Contains(c) ? '_' : c));
        return string.IsNullOrWhiteSpace(sanitised) ? Guid.NewGuid().ToString("N") : sanitised;
    }

    public Task<Stream> OpenAsync(string relativePath, CancellationToken ct) =>
        Task.FromResult<Stream>(File.OpenRead(Path.Combine(_root, relativePath)));

    public Task DeleteAsync(string relativePath, CancellationToken ct)
    {
        var full = Path.Combine(_root, relativePath);
        if (File.Exists(full)) File.Delete(full);
        return Task.CompletedTask;
    }
}