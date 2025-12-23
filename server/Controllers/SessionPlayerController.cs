using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Data;
using server.Models;
using System.Security.Claims;

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
    public async Task<IActionResult> Update(int id, string? nick, int? totalScore)
    {
        var player = await _db.SessionPlayer
            .Include(p => p.Session)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (player == null)
            return NotFound();

        if (Role != "Admin" && player.Session.UserId != UserId)
            return Forbid();

        if (!string.IsNullOrWhiteSpace(nick))
            player.Nick = nick.Trim();

        if (totalScore.HasValue)
            player.TotalScore = totalScore.Value;

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