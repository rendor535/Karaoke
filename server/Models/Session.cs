namespace server.Models;
public class Session
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; }
    public bool IsActive { get; set; } = false;
    public string Name { get; set; } = "";
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; } = DateTime.MinValue;
    public ICollection<SessionQueueItem> Queue { get; set; } = new List<SessionQueueItem>();
    public ICollection<SessionPlayer> Players { get; set; } = new List<SessionPlayer>();
} 
