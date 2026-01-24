using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Data;
using server.Models;
using server.DTOs;
using System.Security.Claims;
using Swashbuckle.AspNetCore.Annotations;

[ApiController]
[Route("session-player")]
public class SessionPlayerController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public SessionPlayerController(ApplicationDbContext db) => _db = db;

    private int UserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string Role =>
        User.FindFirstValue(ClaimTypes.Role)!;
    
    [Authorize]
    [HttpGet("{id}")]
    [SwaggerOperation(
        Summary = "Pobierz gracza sesji",
        Description = "Zwraca dane pojedynczego gracza przypisanego do sesji."
    )]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(int id)
    {
        var player = await _db.SessionPlayer
            .Include(p => p.Session)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (player == null)
            return NotFound();

        if (Role != "Admin" && player.Session.UserId != UserId)
            return Forbid();

        return Ok(new
        {
            player.Id,
            player.Nick,
            player.TotalScore,
            player.SessionId
        });
    }

    // READ ALL FOR SESSION
    [Authorize]
    [HttpGet("session/{sessionId}")]
    [SwaggerOperation(
        Summary = "Lista graczy w sesji",
        Description = "Zwraca listę graczy przypisanych do wskazanej sesji."
    )]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetForSession(int sessionId)
    {
        var session = await _db.Session.FirstOrDefaultAsync(s => s.Id == sessionId);
        if (session == null)
            return NotFound();

        if (Role != "Admin" && session.UserId != UserId)
            return Forbid();

        var players = await _db.SessionPlayer
            .Where(p => p.SessionId == sessionId)
            .Select(p => new
            {
                p.Id,
                p.Nick,
                p.TotalScore
            })
            .ToListAsync();

        return Ok(players);
    }

    // UPDATE
    [Authorize]
    [HttpPatch("{id}")]
    [SwaggerOperation(
        Summary = "Aktualizuj gracza",
        Description = "Aktualizuje dane gracza w sesji (nick lub wynik)."
    )]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSessionPlayerRequest request)
    {
        var player = await _db.SessionPlayer
            .Include(p => p.Session)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (player == null)
            return NotFound();

        if (Role != "Admin" && player.Session.UserId != UserId)
            return Forbid();

        if (!string.IsNullOrWhiteSpace(request.Nick))
            player.Nick = request.Nick.Trim();

        if (request.TotalScore.HasValue)
            player.TotalScore = request.TotalScore.Value;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            player.Id,
            player.Nick,
            player.TotalScore
        });
    }

    // DELETE
    [Authorize]
    [HttpDelete("{id}")]
    [SwaggerOperation(
        Summary = "Usuń gracza z sesji",
        Description = "Usuwa gracza z sesji karaoke."
    )]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var player = await _db.SessionPlayer
            .Include(p => p.Session)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (player == null)
            return NotFound();

        if (Role != "Admin" && player.Session.UserId != UserId)
            return Forbid();

        _db.SessionPlayer.Remove(player);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}