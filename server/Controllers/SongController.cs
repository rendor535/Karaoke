using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Data;
using server.Models;

[ApiController]
[Route("song")]
public class SongController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    public SongController(ApplicationDbContext db) => _db = db;

    [HttpPost("add")]
    public async Task<IActionResult> AddSong([FromBody] Song song)
    {
        _db.Song.Add(song);
        await _db.SaveChangesAsync();
        return Ok(song);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var songs = await _db.Song.ToListAsync();
        return Ok(songs);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var song = await _db.Song.FindAsync(id);
        if (song == null) return NotFound();
        return Ok(song);
    }
}
