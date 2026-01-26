namespace server.DTOs.Auth;

public class LoginRequest
{
    /// <example>user1@test.com</example>
    public string Email { get; set; } = "";

    /// <example>User123!</example>
    public string Password { get; set; } = "";
}
