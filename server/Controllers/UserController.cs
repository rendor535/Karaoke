using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using server.Data;
using server.Models;
using Swashbuckle.AspNetCore.Annotations;

namespace server.Controllers;

[ApiController]
[Route("user")]
public class UserController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public UserController(ApplicationDbContext db)
    {
        _db = db;
    }

    // GET /user/me
    [Authorize]
    [HttpGet("me")]
    [SwaggerOperation(Summary = "Pobierz aktualnego użytkownika")]
    public async Task<IActionResult> GetMe()
    {
        var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(idClaim, out var userId))
            return Unauthorized();

        var user = await _db.User
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.Role
            })
            .FirstOrDefaultAsync();

        if (user == null)
            return NotFound();

        return Ok(user);
    }

    // GET /user/{id}
    [Authorize]
    [HttpGet("{id}")]
    [SwaggerOperation(Summary = "Pobierz użytkownika po ID")]
    public async Task<IActionResult> GetById(int id)
    {
        var callerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var callerRole = User.FindFirstValue(ClaimTypes.Role);

        if (callerRole != "Admin" && callerId != id)
            return Forbid();

        var user = await _db.User
            .Where(u => u.Id == id)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.Role
            })
            .FirstOrDefaultAsync();

        if (user == null)
            return NotFound();

        return Ok(user);
    }

    public class PatchUserDto
    {
        public string? Role { get; set; }
        public string? NewPassword { get; set; }
    }

    // PATCH /user/{id}
    [Authorize]
    [HttpPatch("{id}")]
    [SwaggerOperation(Summary = "Aktualizuj użytkownika")]
    public async Task<IActionResult> PatchUser(int id, [FromBody] PatchUserDto dto)
    {
        var callerRole = User.FindFirstValue(ClaimTypes.Role);
        if (callerRole != "Admin")
            return Forbid();

        var user = await _db.User.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.Role))
            user.Role = dto.Role;

        if (!string.IsNullOrWhiteSpace(dto.NewPassword))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);

        await _db.SaveChangesAsync();

        return Ok(new
        {
            user.Id,
            user.Email,
            user.Role
        });
    }

    // DELETE /user/{id}
    [Authorize]
    [HttpDelete("{id}")]
    [SwaggerOperation(Summary = "Usuń użytkownika")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var callerRole = User.FindFirstValue(ClaimTypes.Role);
        if (callerRole != "Admin")
            return Forbid();

        var user = await _db.User.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            return NotFound();

        _db.User.Remove(user);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
