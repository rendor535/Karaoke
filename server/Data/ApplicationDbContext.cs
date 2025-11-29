using Microsoft.EntityFrameworkCore;
using server.Models;

namespace server.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) {}

    public DbSet<User> User { get; set; }
    public DbSet<Song> Song { get; set; }
    public DbSet<Session> Session { get; set; }
    public DbSet<SessionQueueItem> SessionQueueItem { get; set; }
    public DbSet<SessionPlayer> SessionPlayer { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // USER -> SESSIONS
        modelBuilder.Entity<Session>()
            .HasOne(s => s.User)
            .WithMany(u => u.Sessions)
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // SESSION -> QUEUE ITEMS
        modelBuilder.Entity<SessionQueueItem>()
            .HasOne(q => q.Session)
            .WithMany(s => s.Queue)
            .HasForeignKey(q => q.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        // SESSION -> PLAYERS
        modelBuilder.Entity<SessionPlayer>()
            .HasOne(p => p.Session)
            .WithMany(s => s.Players)
            .HasForeignKey(p => p.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        // SONG -> QUEUE ITEMS
        modelBuilder.Entity<SessionQueueItem>()
            .HasOne(q => q.Song)
            .WithMany(s => s.SessionQueueItems)
            .HasForeignKey(q => q.SongId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
