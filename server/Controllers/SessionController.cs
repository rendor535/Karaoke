using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Data;
using server.Models;
using server.DTOs;
using System.Security.Claims;


[ApiController]
[Route("session")]
public class SessionController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public SessionController(ApplicationDbContext db) => _db = db;

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
    }

    // Utwórz sesję
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSessionRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var session = new Session
        {
            Name = string.IsNullOrWhiteSpace(request.Name)
                ? $"Session {DateTime.UtcNow:yyyy-MM-dd HH:mm}"
                : request.Name.Trim(),

            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _db.Session.Add(session);
        await _db.SaveChangesAsync();

        return Ok(session);
    }

    // Dodaj gracza (nick)
    [Authorize]
    [HttpPost("{sessionId}/add-player")]
    public async Task<IActionResult> AddPlayer(int sessionId, [FromBody] string nick)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role = User.FindFirstValue(ClaimTypes.Role);

        var session = await _db.Session
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null)
            return NotFound();

        if (role != "Admin" && session.UserId != userId)
            return Forbid();

        var player = new SessionPlayer
        {
            SessionId = sessionId,
            Nick = nick.Trim(),
            TotalScore = 0
        };

        _db.SessionPlayer.Add(player);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            player.Id,
            player.Nick,
            player.TotalScore
        });
    }

    // Dodaj piosenkę do kolejki
    [Authorize]
    [HttpPost("{sessionId}/add-song")]
    public async Task<IActionResult> AddSongToQueue(int sessionId, [FromBody] int songId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role = User.FindFirstValue(ClaimTypes.Role);

        var session = await _db.Session
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null)
            return NotFound();

        if (role != "Admin" && session.UserId != userId)
            return Forbid();

        var count = await _db.SessionQueueItem
            .CountAsync(q => q.SessionId == sessionId);

        var item = new SessionQueueItem
        {
            SessionId = sessionId,
            SongId = songId,
            Position = count + 1
        };

        _db.SessionQueueItem.Add(item);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            item.Id,
            item.SongId,
            item.Position
        });
    }

    // Pobierz sesję z kolejką i graczami
    [Authorize]
    [HttpGet("{sessionId}")]
    public async Task<IActionResult> GetSession(int sessionId)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role = User.FindFirstValue(ClaimTypes.Role);

        var session = await _db.Session
            .Include(s => s.Players)
            .Include(s => s.Queue)
                .ThenInclude(q => q.Song)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null)
            return NotFound();

        if (role != "Admin" && session.UserId != userId)
            return Forbid();

        return Ok(new
        {
            session.Id,
            session.Name,
            session.CreatedAt,
            Players = session.Players.Select(p => new
            {
                p.Id,
                p.Nick,
                p.TotalScore
            }),
            Queue = session.Queue
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
        });
    }

    // update session name
    [Authorize]
    [HttpPatch("{sessionId}")]
    public async Task<IActionResult> Update(int sessionId, [FromBody] CreateSessionRequest request)
    {
        var userId = GetUserId();
        var role = User.FindFirstValue(ClaimTypes.Role);

        var session = await _db.Session.FirstOrDefaultAsync(s => s.Id == sessionId);
        if (session == null)
            return NotFound();

        if (role != "Admin" && session.UserId != userId)
            return Forbid();
        if (!string.IsNullOrWhiteSpace(request.Name))
            session.Name = request.Name.Trim();

        await _db.SaveChangesAsync();

        return Ok(new
        {
            session.Id,
            session.Name,
            session.CreatedAt
        });
    }

    // usuwanie sesji i wszystkich powiązań
    [Authorize]
    [HttpDelete("{sessionId}")]
    public async Task<IActionResult> Delete(int sessionId)
    {
        var userId = GetUserId();
        var role = User.FindFirstValue(ClaimTypes.Role);

        var session = await _db.Session
            .Include(s => s.Players)
            .Include(s => s.Queue)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null)
            return NotFound();

        if (role != "Admin" && session.UserId != userId)
            return Forbid();

        // USUWANIE DZIECI
        _db.SessionPlayer.RemoveRange(session.Players);
        _db.SessionQueueItem.RemoveRange(session.Queue);

        // USUWANIE SESJI
        _db.Session.Remove(session);

        await _db.SaveChangesAsync();

        return NoContent();
    }

    // get wszystkich sesji - admin
    // GET /session  -> wszystkie sesje (tylko Admin)
    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var sessions = await _db.Session
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.CreatedAt,
                Owner = new
                {
                    s.User.Id,
                    s.User.Email
                },
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
            .ToListAsync();

        return Ok(sessions);
    }

}