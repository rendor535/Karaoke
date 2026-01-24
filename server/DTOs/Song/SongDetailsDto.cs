using Microsoft.EntityFrameworkCore;

namespace server.DTOs;

[Keyless]
public class SongDetailsDto
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Artist { get; set; } = "";
    public string Language { get; set; } = "";
    public double BPM { get; set; }
    public double GAP { get; set; }
    public string? TxtPath { get; set; }
    public string? AudioPath { get; set; }
    public string? VideoPath { get; set; }
    public string? CoverPath { get; set; }
    public string FolderName { get; set; } = "";
}
