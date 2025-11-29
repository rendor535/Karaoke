namespace server.Models;
public class SessionQueueItem
{
    public int Id { get; set; }

    public int SessionId { get; set; }
    public Session Session { get; set; }

    public int SongId { get; set; }
    public Song Song { get; set; }

    public int Position { get; set; }  // 1,2,3 itd. kolejność
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}
