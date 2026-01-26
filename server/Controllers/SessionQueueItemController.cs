using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Data;
using server.Models;
using server.DTOs;
using System.Security.Claims;
using Swashbuckle.AspNetCore.Annotations;

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

    // GET - jeden item
    /// <summary>
    /// Pobierz element kolejki
    /// </summary>
    /// <remarks>
    /// Przykładowy request:
    ///
    /// GET /session-queue-item/1
    ///
    /// Przykładowy response:
    /// {
    ///   "id": 1,
    ///   "position": 2,
    ///   "addedAt": "2026-01-24T18:10:00Z",
    ///   "song": {
    ///     "id": 3,
    ///     "title": "Money Money Money",
    ///     "artist": "ABBA",
    ///     "language": "English",
    ///     "bpm": 339.2,
    ///     "gap": 12116.75,
    ///     "coverPath": "ABBA - Money Money Money [CO].jpg",
    ///     "folderName": "ABBA - Money Money Money",
    ///     "audioPath": "ABBA - Money Money Money.mp3",
    ///     "txtPath": "ABBA - Money Money Money.txt",
    ///     "videoPath": "ABBA - Money Money Money.mp4"
    ///   }
    /// }
    /// </remarks>
    [HttpGet("{id}")]
    [SwaggerOperation(
        Summary = "Pobierz element kolejki",
        Description = "Zwraca szczegóły pojedynczego elementu kolejki dla danej sesji."
    )]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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


    // POST /sessionQueueItem/{id}/move
    /// <summary>
    /// Zmień pozycję w kolejce
    /// </summary>
    /// <remarks>
    /// Przykładowy request:
    ///
    /// POST /session-queue-item/5/move
    /// "up"
    ///
    /// lub
    ///
    /// "down"
    ///
    /// Przykładowy response:
    /// HTTP 200 OK
    /// </remarks>
    [HttpPost("{id}/move")]
    [SwaggerOperation(
        Summary = "Zmień pozycję w kolejce",
        Description = "Przesuwa element kolejki w górę lub w dół."
    )]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
    /// <summary>
    /// Usuń element kolejki
    /// </summary>
    /// <remarks>
    /// Przykładowy request:
    ///
    /// DELETE /session-queue-item/5
    ///
    /// Przykładowy response:
    /// HTTP 204 No Content
    /// </remarks>
    [HttpDelete("{id}")]
    [SwaggerOperation(
        Summary = "Usuń element kolejki",
        Description = "Usuwa element z kolejki sesji i aktualizuje pozycje pozostałych elementów."
    )]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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

}
