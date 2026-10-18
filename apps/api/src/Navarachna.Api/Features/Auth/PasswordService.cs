using Microsoft.AspNetCore.Identity;
using Navarachna.Api.Entities;

namespace Navarachna.Api.Features.Auth;

public interface IPasswordService
{
    string HashPassword(User user, string password);
    bool VerifyPassword(User user, string hashedPassword, string providedPassword);
}

public class PasswordService : IPasswordService
{
    private readonly PasswordHasher<User> _hasher = new();

    public string HashPassword(User user, string password)
    {
        return _hasher.HashPassword(user, password);
    }

    public bool VerifyPassword(User user, string hashedPassword, string providedPassword)
    {
        try
        {
            var result = _hasher.VerifyHashedPassword(user, hashedPassword, providedPassword);
            return result == PasswordVerificationResult.Success || result == PasswordVerificationResult.SuccessRehashNeeded;
        }
        catch (FormatException)
        {
            // Graceful fallback for bootstrap plaintext seed before first hash update
            return hashedPassword == providedPassword;
        }
    }
}
