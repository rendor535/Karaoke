using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using server.Data;
using server.Models;
using Swashbuckle.AspNetCore.Annotations;

namespace server.Controllers;

// TODO sprawdzic i poprawic 
[ApiController]
[Route("song")]
public class SongController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public SongController(ApplicationDbContext db)
    {
        _db = db;
    }

    // POST /song
    // Admin / Superuser
    [Authorize(Roles = "Admin,Superuser")]
    [HttpPost]
    [SwaggerOperation(Summary = "Dodaj utwór")]
    public async Task<IActionResult> Create([FromBody] Song song)
    {
        if (string.IsNullOrWhiteSpace(song.Title))
            return BadRequest("Title required");

        _db.Song.Add(song);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = song.Id }, song);
    }

    // GET /song
    // Public
    [HttpGet]
    [SwaggerOperation(Summary = "Lista utworów")]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? q,
        [FromQuery] string? language,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 20;

        var query = _db.Song.AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(s =>
                s.Title.ToLower().Contains(q.ToLower()) ||
                s.Artist.ToLower().Contains(q.ToLower()));

        if (!string.IsNullOrWhiteSpace(language))
            query = query.Where(s => s.Language == language);

        var total = await query.CountAsync();

        var songs = await query
            .OrderBy(s => s.Id)
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(s => new
            {
                s.Id,
                s.Title,
                s.Artist,
                s.Language,
                s.BPM,
                s.GAP,
                s.CoverPath
            })
            .ToListAsync();

        return Ok(new
        {
            data = songs,
            page,
            limit,
            total,
            totalPages = (int)Math.Ceiling(total / (double)limit)
        });
    }

    // GET /song/{id}
    // Public
    [HttpGet("{id}")]
    [SwaggerOperation(Summary = "Szczegóły utworu")]
    public async Task<IActionResult> GetById(int id)
    {
        var song = await _db.Song
            .Where(s => s.Id == id)
            .Select(s => new
            {
                s.Id,
                s.Title,
                s.Artist,
                s.Language,
                s.BPM,
                s.GAP,
                s.TxtPath,
                s.AudioPath,
                s.VideoPath,
                s.CoverPath
            })
            .FirstOrDefaultAsync();

        if (song == null)
            return NotFound();

        return Ok(song);
    }

    // PATCH /song/{id}
    // Admin / Superuser
    [Authorize(Roles = "Admin,Superuser")]
    [HttpPatch("{id}")]
    [SwaggerOperation(Summary = "Aktualizuj utwór")]
    public async Task<IActionResult> Update(int id, [FromBody] Song dto)
    {
        var song = await _db.Song.FindAsync(id);
        if (song == null)
            return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.Title))
            song.Title = dto.Title;
        if (!string.IsNullOrWhiteSpace(dto.Artist))
            song.Artist = dto.Artist;
        if (!string.IsNullOrWhiteSpace(dto.Language))
            song.Language = dto.Language;

        if (dto.BPM > 0)
            song.BPM = dto.BPM;

        song.GAP = dto.GAP;

        if (!string.IsNullOrWhiteSpace(dto.TxtPath))
            song.TxtPath = dto.TxtPath;
        if (!string.IsNullOrWhiteSpace(dto.AudioPath))
            song.AudioPath = dto.AudioPath;
        if (!string.IsNullOrWhiteSpace(dto.VideoPath))
            song.VideoPath = dto.VideoPath;
        if (!string.IsNullOrWhiteSpace(dto.CoverPath))
            song.CoverPath = dto.CoverPath;

        await _db.SaveChangesAsync();

        return Ok(song);
    }

    // DELETE /song/{id}
    // Admin only
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    [SwaggerOperation(Summary = "Usuń utwór")]
    public async Task<IActionResult> Delete(int id)
    {
        var song = await _db.Song.FindAsync(id);
        if (song == null)
            return NotFound();

        _db.Song.Remove(song);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
