namespace server.Models;
public class Session
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; }

    public string Name { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<SessionQueueItem> Queue { get; set; } = new List<SessionQueueItem>();
    public ICollection<SessionPlayer> Players { get; set; } = new List<SessionPlayer>();
}
