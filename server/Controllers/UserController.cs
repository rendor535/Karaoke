using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using server.Data;
using server.Models;
using Swashbuckle.AspNetCore.Annotations;
using server.DTOs;

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
    /// <summary>
    /// Pobierz aktualnego użytkownika
    /// </summary>
    /// <remarks>
    /// Przykładowy request:
    ///
    /// GET /user/me
    ///
    /// Przykładowy response:
    /// {
    ///   "id": 2,
    ///   "email": "kokos@test.com",
    ///   "role": "Superuser",
    ///   "sessions": [
    ///     {
    ///       "id": 1,
    ///       "name": "Test Session",
    ///       "createdAt": "2026-01-24T17:30:00Z",
    ///       "players": [
    ///         { "id": 1, "nick": "PlayerOne", "totalScore": 1200 }
    ///       ],
    ///       "queue": [
    ///         {
    ///           "id": 1,
    ///           "position": 1,
    ///           "song": {
    ///             "id": 3,
    ///             "title": "Money Money Money",
    ///             "artist": "ABBA",
    ///             "language": "English"
    ///           }
    ///         }
    ///       ]
    ///     }
    ///   ]
    /// }
    /// </remarks>
    [Authorize]
    [HttpGet("me")]
    [SwaggerOperation(
        Summary = "Pobierz aktualnego użytkownika wraz z sesjami",
        Description = "Zwraca dane zalogowanego użytkownika wraz z jego sesjami."
    )]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
                u.Role,
                Sessions = u.Sessions
                    .OrderByDescending(s => s.CreatedAt)
                    .Select(s => new
                    {
                        s.Id,
                        s.Name,
                        s.CreatedAt,
                        Players = s.Players.Select(p => new
                        {
                            p.Id,
                            p.Nick,
                            p.TotalScore
                        }),
                        Queue = s.Queue
                            .OrderBy(q => q.Position)
                            .Select(q => new
                            {
                                q.Id,
                                q.Position,
                                Song = new
                                {
                                    q.Song.Id,
                                    q.Song.Title,
                                    q.Song.Artist,
                                    q.Song.Language
                                }
                            })
                    })
            })
            .FirstOrDefaultAsync();

        if (user == null)
            return NotFound();

        return Ok(user);
    }
    
    // GET /user/{id}
    /// <summary>
    /// Pobierz użytkownika po ID
    /// </summary>
    /// <remarks>
    /// Przykładowy request:
    ///
    /// GET /user/2
    ///
    /// Przykładowy response:
    /// {
    ///   "id": 2,
    ///   "email": "kokos@test.com",
    ///   "role": "Superuser",
    ///   "sessions": []
    /// }
    /// </remarks>
    [Authorize]
    [HttpGet("{id}")]
    [SwaggerOperation(
        Summary = "Pobierz użytkownika po ID wraz z sesjami",
        Description = "Zwraca dane użytkownika. Dostępne dla administratora lub właściciela konta."
    )]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
                u.Role,
                Sessions = u.Sessions
                    .OrderByDescending(s => s.CreatedAt)
                    .Select(s => new
                    {
                        s.Id,
                        s.Name,
                        s.CreatedAt,
                        Players = s.Players.Select(p => new
                        {
                            p.Id,
                            p.Nick,
                            p.TotalScore
                        }),
                        Queue = s.Queue
                            .OrderBy(q => q.Position)
                            .Select(q => new
                            {
                                q.Id,
                                q.Position,
                                Song = new
                                {
                                    q.Song.Id,
                                    q.Song.Title,
                                    q.Song.Artist,
                                    q.Song.Language
                                }
                            })
                    })
            })
            .FirstOrDefaultAsync();

        if (user == null)
            return NotFound();

        return Ok(user);
    }

    // PATCH /user/{id}
    /// <summary>
    /// Aktualizuj użytkownika
    /// </summary>
    /// <remarks>
    /// Przykładowy request:
    ///
    /// PATCH /user/3
    /// {
    ///   "role": "Superuser",
    ///   "newPassword": "NewStrongPass123!"
    /// }
    ///
    /// Przykładowy response:
    /// {
    ///   "id": 3,
    ///   "email": "user1@test.com",
    ///   "role": "Superuser"
    /// }
    /// </remarks>
    [Authorize]
    [HttpPatch("{id}")]
    [SwaggerOperation(
        Summary = "Aktualizuj użytkownika",
        Description = "Umożliwia administratorowi zmianę roli lub hasła użytkownika."
    )]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
    /// <summary>
    /// Usuń użytkownika
    /// </summary>
    /// <remarks>
    /// Przykładowy request:
    ///
    /// DELETE /user/4
    ///
    /// Przykładowy response:
    /// HTTP 204 No Content
    /// </remarks>
        [Authorize]
    [HttpDelete("{id}")]
    [SwaggerOperation(
        Summary = "Usuń użytkownika",
        Description = "Usuwa użytkownika z systemu. Dostępne tylko dla administratora."
    )]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
