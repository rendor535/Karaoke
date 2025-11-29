using Microsoft.AspNetCore.Mvc;

using Microsoft.IdentityModel.Tokens;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using BCrypt.Net;

using System.Security.Claims;
using System.Collections.Concurrent;

using Swashbuckle.AspNetCore.Annotations;

using server.DTOs.Auth;

using server.Data;
using server.Models;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;
    // private static readonly ConcurrentDictionary<string, List<DateTime>> _rateLimitStore = new();
    public AuthController(ApplicationDbContext db, IConfiguration config)
    {
        this._db = db;
        this._config = config;
    }
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _db.User
            .Where(u => u.Email == request.Email)
            .Select(u => new User
            {
                Id = u.Id,
                Email = u.Email,
                PasswordHash = u.PasswordHash,
                Role = u.Role,
            })
            .FirstOrDefaultAsync();

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Nieprawidłowy email lub hasło" });
        }

        var token = GenerateJwtToken(user);

        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = DateTimeOffset.UtcNow.AddHours(1)
        };

        Response.Cookies.Append("jwt", token, cookieOptions);

        return Ok(new { message = "Zalogowano pomyślnie" });
    }

    private string GenerateJwtToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Append("jwt", "", new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            Expires = DateTime.UtcNow.AddDays(-1),
            SameSite = SameSiteMode.None,
            Path = "/"
        });

        return Ok(new { success = true, message = "Wylogowano!" });
    }
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        // Walidacja emaila
        if (!request.Email.Contains("@"))
            return BadRequest(new { message = "Nieprawidłowy email" });

        // Czy email jest zajęty?
        var exists = await _db.User.AnyAsync(u => u.Email == request.Email);
        if (exists)
            return BadRequest(new { message = "Konto o tym emailu już istnieje" });

        // Walidacja hasła
        if (request.Password.Length < 6)
            return BadRequest(new { message = "Hasło musi mieć min. 6 znaków" });

        // Hash hasła
        var hash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        var user = new User
        {
            Email = request.Email,
            PasswordHash = hash,
            Role = "User",
            Sessions = new List<Session>()
        };

        _db.User.Add(user);
        await _db.SaveChangesAsync();

        // JWT
        var token = GenerateJwtToken(user);

        Response.Cookies.Append("jwt", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = DateTimeOffset.UtcNow.AddHours(1),
            Path = "/"
        });

        return Ok(new { message = "Konto utworzone" });
    }
    /*
    [HttpPatch("change-password")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    [SwaggerOperation(
        Summary = "Zmień hasło użytkownika", 
        Description = "Zmienia hasło zalogowanego użytkownika z walidacją siły hasła i rate limiting.")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        try
        {
            var clientId = GetClientId();
            if (IsRateLimited(clientId))
            {
                return StatusCode(429, new { success = false, error = "Przekroczono rate limie!" });
            }

            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { success = false, error = "Nie ma usera!" });
            }

            var user = await _db.User.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                return Unauthorized(new { success = false, error = "Nie ma usera!" });
            }

            if (user.IsDeleted)
            {
                return Unauthorized(new { message = "Konto zostało usunięte" });
            }

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return BadRequest(new { success = false, error = "Nieprawidłowe hasło" });
            }

            if (request.NewPassword != request.ConfirmNewPassword)
            {
                return BadRequest(new { success = false, error = "Nowe hasła nie zgadzają się!" });
            }

            if (BCrypt.Net.BCrypt.Verify(request.NewPassword, user.PasswordHash))
            {
                return BadRequest(new { success = false, error = "404 błąd serwera, spróbuj jeszcze raz" });
            }

            var passwordValidationResult = ValidatePasswordStrength(request.NewPassword);
            if (!passwordValidationResult.IsValid)
            {
                return BadRequest(new { success = false, error = passwordValidationResult.ErrorMessage });
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Zmieniono hasło!" });
        }
        catch (Exception)
        {
            return StatusCode(500, new { success = false, error = "Internal server error!!" });
        }
    }

    private (bool IsValid, string ErrorMessage) ValidatePasswordStrength(string password)
    {
        if (string.IsNullOrEmpty(password))
        {
            return (false, "Hasło nie może być puste");
        }

        if (password.Length < 6)
        {
            return (false, "Hasło musi mieć przynajniej 6 znaków");
        }

        if (!password.Any(char.IsUpper))
        {
            return (false, "Hasło musi mieć przynjamniej jedną dużą litere!");
        }

        if (!password.Any(char.IsLower))
        {
            return (false, "Hasło musi mieć przynjmniej jedną małą litere!");
        }

        if (!password.Any(char.IsDigit))
        {
            return (false, "Hasło musi zawierać liczby");
        }

        if (!password.Any(ch => !char.IsLetterOrDigit(ch)))
        {
            return (false, "Hasło musi mieć znaki specjalne!");
        }

        return (true, string.Empty);
    }

    private string GetClientId()
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous";
        return $"{ipAddress}:{userId}";
    }

    private bool IsRateLimited(string clientId)
    {
        var now = DateTime.UtcNow;
        var timeWindow = TimeSpan.FromMinutes(15);
        var maxRequest = 5;
        var request = _rateLimitStore.GetOrAdd(clientId, new List<DateTime>());
        lock (request)
        {
            request.RemoveAll( r => r < now.Subtract(timeWindow));
            if (request.Count >= maxRequest)
            {
                return true;
            }

            request.Add(now);
            return false;
        }
    }
    */


}