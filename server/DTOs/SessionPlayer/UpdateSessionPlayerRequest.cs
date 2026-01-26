namespace server.DTOs;

public class UpdateSessionPlayerRequest
{
    /// <example>PlayerOneUpdated</example>
    public string? Nick { get; set; }

    /// <example>1500</example>
    public int? TotalScore { get; set; }
}