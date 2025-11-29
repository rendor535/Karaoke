namespace server.Models;
public class SessionPlayer
{
    public int Id { get; set; }
    public int SessionId { get; set; }
    public Session Session { get; set; }
    public string Nick { get; set; } = "";
    public int TotalScore { get; set; } = 0;
}
