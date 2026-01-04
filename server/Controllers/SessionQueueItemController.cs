using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Data;
using server.Models;
using server.DTOs;
using System.Security.Claims;

[ApiController]
[Route("session-queue-item")]
[Authorize]
public class SessionQueueItemController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public SessionQueueItemController(ApplicationDbContext db) => _db = db;

    private int UserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private bool IsAdmin =>
        User.FindFirstValue(ClaimTypes.Role) == "Admin";

    private bool HasAccess(Session session)
    {
        return IsAdmin || session.UserId == UserId;
    }

    // POST — dodaj item do kolejki (alternatywa dla /session/{id}/add-song), nwm chyba do usuniiecia 
    /*
    [HttpPost]
    public async Task<IActionResult> Create(int sessionId, int songId)
    {
        var session = await _db.Session.FirstOrDefaultAsync(s => s.Id == sessionId);
        if (session == null)
            return NotFound("Session not found");

        if (!HasAccess(session))
            return Forbid();

        var position = await _db.SessionQueueItem
            .CountAsync(q => q.SessionId == sessionId) + 1;

        var item = new SessionQueueItem
        {
            SessionId = sessionId,
            SongId = songId,
            Position = position
        };

        _db.SessionQueueItem.Add(item);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            item.Id,
            item.SessionId,
            item.SongId,
            item.Position
        });
    }
    */
    // GET - jeden item
    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var item = await _db.SessionQueueItem
            .Include(q => q.Session)
            .Include(q => q.Song)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (item == null)
            return NotFound();

        if (!HasAccess(item.Session))
            return Forbid();

        return Ok(new
        {
            item.Id,
            item.Position,
            item.AddedAt,
            Song = new
            {
                id = item.Song.Id,
                title = item.Song.Title,
                artist = item.Song.Artist,
                language = item.Song.Language,
                bpm = item.Song.BPM,
                gap = item.Song.GAP,
                coverPath = item.Song.CoverPath,
                folderName = item.Song.FolderName,
                audioPath = item.Song.AudioPath,
                txtPath = item.Song.TxtPath,
                videoPath = item.Song.VideoPath,
            }
        });
    }

    // PATCH - zmiana pozycji (np. reorder)
    /*
    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateQueueItemRequest request)
    {
        var item = await _db.SessionQueueItem
            .Include(q => q.Session)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (item == null)
            return NotFound();

        if (!HasAccess(item.Session))
            return Forbid();

        if (request.Position.HasValue && request.Position > 0)
            item.Position = request.Position.Value;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            item.Id,
            item.Position
        });
    }
    */
    // POST /sessionQueueItem/{id}/move
    [HttpPost("{id}/move")]
    public async Task<IActionResult> Move(int id, [FromBody] string direction)
    {
        var item = await _db.SessionQueueItem
            .Include(q => q.Session)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (item == null)
            return NotFound();

        if (!HasAccess(item.Session))
            return Forbid();

        if (direction != "up" && direction != "down")
            return BadRequest();

        var targetPosition = direction == "up"
            ? item.Position - 1
            : item.Position + 1;

        if (targetPosition < 1)
            return Ok(); // już na górze

        var swapItem = await _db.SessionQueueItem
            .FirstOrDefaultAsync(q =>
                q.SessionId == item.SessionId &&
                q.Position == targetPosition);

        if (swapItem == null)
            return Ok(); // już na dole

        // swap
        swapItem.Position = item.Position;
        item.Position = targetPosition;

        await _db.SaveChangesAsync();

        return Ok();
    }

    // DELETE - usuń item z kolejki
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await _db.SessionQueueItem
            .Include(q => q.Session)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (item == null)
            return NotFound();

        if (!HasAccess(item.Session))
            return Forbid();
        
        var sessionId = item.SessionId;
        var removedPosition = item.Position;
        
        _db.SessionQueueItem.Remove(item);

        var itemsToShift = await _db.SessionQueueItem
        .Where(q =>
            q.SessionId == sessionId &&
            q.Position > removedPosition)
        .ToListAsync();

        foreach (var i in itemsToShift)
        {
            i.Position -= 1;
        }

        await _db.SaveChangesAsync();

        return NoContent();
    }

    /*
    // GET - kolejka dla sesji
    [HttpGet("session/{sessionId}")]
    public async Task<IActionResult> GetForSession(int sessionId)
    {
        var session = await _db.Session.FirstOrDefaultAsync(s => s.Id == sessionId);
        if (session == null)
            return NotFound();

        if (!HasAccess(session))
            return Forbid();

        var queue = await _db.SessionQueueItem
            .Where(q => q.SessionId == sessionId)
            .OrderBy(q => q.Position)
            .Include(q => q.Song)
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
            .ToListAsync();

        return Ok(queue);
    }
    */
}
