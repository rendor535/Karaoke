namespace server.DTOs;
public class CreateSessionRequest
{
    public string Name { get; set; } = "";
    public bool IsActive { get; set; } = false;
}
