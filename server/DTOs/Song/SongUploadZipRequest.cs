namespace server.DTOs;

public class SongUploadZipRequest
{
    public string FolderName { get; set; } = "";
    public IFormFile Zip { get; set; } = null!;
}
