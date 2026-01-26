namespace server.DTOs;

public class PatchUserDto
{
    /// <example>Admin</example>
    public string? Role { get; set; }

    /// <example>NewStrongPass123!</example>
    public string? NewPassword { get; set; }
}
