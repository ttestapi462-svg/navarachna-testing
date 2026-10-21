namespace EmployeeApi.Services;

public interface IFileStorage
{
    Task<string> SaveAsync(Stream content, string extension, CancellationToken ct);
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

    public async Task<string> SaveAsync(Stream content, string extension, CancellationToken ct)
    {
        var rel = Path.Combine(DateTime.UtcNow.ToString("yyyy"), DateTime.UtcNow.ToString("MM"),
                               $"{Guid.NewGuid():N}{extension}");
        var full = Path.Combine(_root, rel);
        Directory.CreateDirectory(Path.GetDirectoryName(full)!);
        await using var fs = File.Create(full);
        await content.CopyToAsync(fs, ct);
        return rel;
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