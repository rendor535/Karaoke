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
    [SwaggerOperation(
        Summary = "Logowanie użytkownika",
        Description = "Uwierzytelnia użytkownika i zapisuje token JWT w ciasteczku."
    )]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
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
            Secure = false,
            SameSite = SameSiteMode.Lax,
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
    [SwaggerOperation(
        Summary = "Wylogowanie",
        Description = "Usuwa token JWT zapisany w ciasteczku."
    )]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Logout()
    {
        Response.Cookies.Append("jwt", "", new CookieOptions
        {
            HttpOnly = true,
            Secure = false,
            SameSite = SameSiteMode.Lax,
            Expires = DateTime.UtcNow.AddDays(-1),
            Path = "/"
        });

        return Ok(new { success = true, message = "Wylogowano!" });
    }
    [HttpPost("register")]
    [SwaggerOperation(
        Summary = "Rejestracja użytkownika",
        Description = "Tworzy nowe konto użytkownika i automatycznie loguje."
    )]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!request.Email.Contains("@"))
            return BadRequest(new { message = "Nieprawidłowy email" });

        if (await _db.User.AnyAsync(u => u.Email == request.Email))
            return BadRequest(new { message = "Konto o tym emailu już istnieje" });

        if (request.Password.Length < 6)
            return BadRequest(new { message = "Hasło musi mieć min. 6 znaków" });

        // DOZWOLONE ROLE (demo)
        var allowedRoles = new[] { "User", "SuperUser", "Admin" };
        if (!allowedRoles.Contains(request.Role))
            return BadRequest(new { message = "Nieprawidłowa rola" });

        var user = new User
        {
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role
        };

        _db.User.Add(user);
        await _db.SaveChangesAsync();

        var token = GenerateJwtToken(user);

        Response.Cookies.Append("jwt", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = false,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddHours(1),
            Path = "/"
        });

        return Ok(new { message = "Konto utworzone" });
    }
}