namespace server.DTOs;
public class CreateSessionRequest
{
    /// <example>Impreza u Stefana</example>
    public string Name { get; set; } = "";
    public bool IsActive { get; set; } = false;
}
