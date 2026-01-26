namespace server.DTOs.Auth;

public class RegisterRequest
{
    /// <example>newuser@test.com</example>
    public string Email { get; set; } = "";

    /// <example>StrongPass123!</example>
    public string Password { get; set; } = "";

    /// <example>User</example>
    public string Role { get; set; } = "User";
}
