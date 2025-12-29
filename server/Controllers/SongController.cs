using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

using System.Security.Claims;
using System.Globalization;

using server.Data;
using server.Models;
using server.DTOs;
using Swashbuckle.AspNetCore.Annotations;

using System.IO.Compression;

namespace server.Controllers;

[ApiController]
[Route("song")]
public class SongController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly string _filesRoot; 
    public SongController(ApplicationDbContext db,  IConfiguration config) // na razie nie będzie to działało w dockerze, TODO zmienić na ścieżkę względną
    {
        _db = db;
        _filesRoot = config["FilesRoot"]
            ?? throw new Exception("FilesRoot not configured");
    }
    // parser do pliku .txt z nutami
    private Dictionary<string, string> ParseSongTxt(string txtFilePath)
    {
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var line in System.IO.File.ReadLines(txtFilePath))
        {
            if (!line.StartsWith("#"))
                break; // kończymy na pierwszej linii tekstu nut
            var idx = line.IndexOf(':');
            if (idx < 0)
                continue;

            var key = line.Substring(1, idx - 1).Trim();
            var value = line[(idx + 1)..].Trim();

            dict[key] = value;
        }
        return dict;
    }

    // POST /song           
    // Admin / Superuser
    [Authorize(Roles = "Admin,Superuser")]
    [HttpPost("upload-folder")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadFolder(
        [FromForm] SongUploadZipRequest request
    )
    {
        if (string.IsNullOrWhiteSpace(request.FolderName))
            return BadRequest("Brak nazwy folderu");

        if (request.Zip == null || request.Zip.Length == 0)
            return BadRequest("Brak pliku ZIP");

        if (!request.Zip.FileName.EndsWith(".zip"))
            return BadRequest("Plik musi być ZIP");

        Directory.CreateDirectory(_filesRoot);

        var songDir = Path.Combine(_filesRoot, request.FolderName);
        Directory.CreateDirectory(songDir);

        var zipPath = Path.Combine(songDir, "upload.zip");

        // zapis ZIP
        await using (var stream = new FileStream(zipPath, FileMode.Create))
        {
            await request.Zip.CopyToAsync(stream);
        }

        // rozpakowanie
        ZipFile.ExtractToDirectory(zipPath, songDir, true);
        System.IO.File.Delete(zipPath);

        // wykrywanie plików
        string? mp3 = null;
        string? txt = null;
        string? cover = null;
        string? video = null;

        foreach (var f in Directory.GetFiles(songDir))
        {
            var ext = Path.GetExtension(f).ToLowerInvariant();

            if (ext == ".mp3") mp3 = f;
            else if (ext == ".txt") txt = f;
            else if (ext == ".jpg" || ext == ".png") cover = f;
            else if (ext == ".mp4" || ext == ".avi") video = f;
        }

        if (mp3 == null || txt == null)
        {
            Directory.Delete(songDir, true);
            return BadRequest("Folder musi zawierać plik .mp3 oraz .txt");
        }

        string FileName(string path) => Path.GetFileName(path);
        // zapis do bazy

        var meta = ParseSongTxt(txt);

        // minimum
        var title = meta.GetValueOrDefault("TITLE");
        var artist = meta.GetValueOrDefault("ARTIST");

        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(artist))
        {
            Directory.Delete(songDir, true);
            return BadRequest("Plik TXT musi zawierać #TITLE i #ARTIST");
        }

        var language = meta.GetValueOrDefault("LANGUAGE") ?? "";
        double.TryParse(meta.GetValueOrDefault("BPM"), NumberStyles.Any, CultureInfo.InvariantCulture, out var bpm);
        double.TryParse(meta.GetValueOrDefault("GAP"), NumberStyles.Any, CultureInfo.InvariantCulture, out var gap);

        // zapis do bazy
        var song = new Song
        {
            FolderName = request.FolderName,

            Title = title,
            Artist = artist,
            Language = language,
            BPM = bpm,
            GAP = gap,

            TxtPath = Path.GetFileName(txt),
            AudioPath = Path.GetFileName(mp3),
            CoverPath = cover != null ? Path.GetFileName(cover) : "",
            VideoPath = video != null ? Path.GetFileName(video) : ""
        };

        _db.Song.Add(song);
        await _db.SaveChangesAsync();

        return Ok(new // TODO nadal zle ustawia path
        {
            song.Id,
            song.Title,
            song.Artist,
            song.Language,
            song.BPM,
            song.GAP,
            song.AudioPath,
            song.TxtPath,
            song.CoverPath,
            song.VideoPath
        });
    }

    // GET /song
    // Public
    [HttpGet]
    [SwaggerOperation(Summary = "Lista utworów")]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? q,
        [FromQuery] string? language,
        [FromQuery] string? searchBy = "all", // all | title | artist
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 20;

        var query = _db.Song.AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            q = q.Trim();

            switch (searchBy?.ToLower())
            {
                case "title":
                    query = query.Where(s =>
                        EF.Functions.ILike(s.Title, $"%{q}%"));
                    break;
                case "artist":
                    query = query.Where(s =>
                        EF.Functions.ILike(s.Artist, $"%{q}%"));
                    break;
                default: 
                    query = query.Where(s =>
                        EF.Functions.ILike(s.Title, $"%{q}%") ||
                        EF.Functions.ILike(s.Artist, $"%{q}%"));
                    break;
            }
        }

        if (!string.IsNullOrWhiteSpace(language))
            query = query.Where(s => EF.Functions.ILike(s.Language, $"%{language}%"));

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
                s.CoverPath,
                s.FolderName
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
                s.CoverPath,
                s.FolderName
            })
            .FirstOrDefaultAsync();

        if (song == null)
            return NotFound();

        return Ok(song);
    }
    // raczej nie uzyje tego, bo zmiana jest ciezka, raczej samo ma sie ustawiac
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
    [Authorize(Roles = "Admin, Superuser")]
    [HttpDelete("{id}")]
    [SwaggerOperation(Summary = "Usuń utwór")]
    public async Task<IActionResult> Delete(int id)
    {
        var song = await _db.Song.FindAsync(id);
        if (song == null)
            return NotFound();

        if (!string.IsNullOrWhiteSpace(song.FolderName))
        {
            var songDir = Path.Combine(_filesRoot, song.FolderName);

            if (Directory.Exists(songDir))
            {
                try
                {
                    Directory.Delete(songDir, recursive: true);
                }
                catch (Exception ex)
                {
                    // return StatusCode(500, $"Błąd usuwania plików: {ex.Message}");
                    Console.WriteLine($"[WARN] Nie udało się usunąć folderu {songDir}: {ex.Message}");
                }
            }
        }
        _db.Song.Remove(song);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    
}
