using server.Models;
using server.Data;

namespace server.Data;

public static class DbSeeder
{
    public static void Seed(ApplicationDbContext context)
    {
        // context.Database.Migrate();

        if (context.User.Any())
        {
            // ODkomentuj return jeśli NIE chcesz nadpisywać danych
            // return;

            // Usuwanie w kolejności zależności
            context.SessionQueueItem.RemoveRange(context.SessionQueueItem);
            context.SessionPlayer.RemoveRange(context.SessionPlayer);
            context.Session.RemoveRange(context.Session);
            context.Song.RemoveRange(context.Song);
            context.User.RemoveRange(context.User);

            context.SaveChanges();
        }

        // ===== USERS =====
        var admin = new User
        {
            Email = "admin@test.com",
            PasswordHash =  BCrypt.Net.BCrypt.HashPassword("admin123"),
            Role = "Admin"
        };

        var superuser = new User
        {
            Email = "kokos@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("suser123"),
            Role = "Superuser"
        };

        var user1 = new User
        {
            Email = "user1@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("User123!"),
            Role = "User"
        };

        var user2 = new User
        {
            Email = "user2@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("User123!"),
            Role = "User"
        };

        context.User.AddRange(admin, superuser, user1, user2);
        context.SaveChanges();

        // ===== SONG =====
        var song = new Song
        {
            Title = "Dancing Queen",
            Artist = "ABBA",
            Language = "English",
            BPM = 339.2,
            GAP = 12116.75,
            TxtPath = " ABBA - Money Money Money.txt",
            AudioPath = "ABBA - Money Money Money.avi",
            VideoPath = "ABBA - Money Money Money.mp4",
            CoverPath = "ABBA - Money Money Money [CO].jpg"
        };

        context.Song.Add(song);
        context.SaveChanges();

        // ===== SESSION =====
        var session = new Session
        {
            Name = "Test Session",
            UserId = superuser.Id
        };

        context.Session.Add(session);
        context.SaveChanges();

        // ===== SESSION PLAYER =====
        var player1 = new SessionPlayer
        {
            SessionId = session.Id,
            Nick = "PlayerOne",
            TotalScore = 1200
        };

        var player2 = new SessionPlayer
        {
            SessionId = session.Id,
            Nick = "PlayerTwo",
            TotalScore = 950
        };

        context.SessionPlayer.AddRange(player1, player2);
        context.SaveChanges();

        // ===== QUEUE =====
        var queueItem = new SessionQueueItem
        {
            SessionId = session.Id,
            SongId = song.Id,
            Position = 1
        };

        context.SessionQueueItem.Add(queueItem);
        context.SaveChanges();
    }
}