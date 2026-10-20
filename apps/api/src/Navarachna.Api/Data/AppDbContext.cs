using Microsoft.EntityFrameworkCore;
using Navarachna.Api.Common;
using Navarachna.Api.Entities;
using EmployeeApi.Models;

namespace Navarachna.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserToken> UserTokens => Set<UserToken>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<EmployeeDocument> EmployeeDocuments => Set<EmployeeDocument>();

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<IAuditableEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    if (entry.Entity.CreatedAt == default)
                    {
                        entry.Entity.CreatedAt = DateTime.UtcNow;
                    }
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("tbl_users");
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(u => u.Username).HasColumnName("username").HasMaxLength(100).IsRequired();
            entity.Property(u => u.Email).HasColumnName("email").HasMaxLength(200);
            entity.Property(u => u.PasswordHash).HasColumnName("password_hash").HasMaxLength(500).IsRequired();
            entity.Property(u => u.FirstName).HasColumnName("first_name").HasMaxLength(100).IsRequired();
            entity.Property(u => u.LastName).HasColumnName("last_name").HasMaxLength(100);
            entity.Property(u => u.PhoneNumber).HasColumnName("phone_number").HasMaxLength(20);
            entity.Property(u => u.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(u => u.IsLocked).HasColumnName("is_locked").HasDefaultValue(false);
            entity.Property(u => u.FailedLoginAttempts).HasColumnName("failed_login_attempts").HasDefaultValue(0);
            entity.Property(u => u.LockoutUntil).HasColumnName("lockout_until");
            entity.Property(u => u.ActiveSessionId).HasColumnName("active_session_id");
            entity.Property(u => u.ActiveDeviceName).HasColumnName("active_device_name").HasMaxLength(150);
            entity.Property(u => u.SessionStartedAt).HasColumnName("session_started_at");
            entity.Property(u => u.LastLoginAt).HasColumnName("last_login_at");

            // Audit Fields
            entity.Property(u => u.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("clock_timestamp()");
            entity.Property(u => u.CreatedBy).HasColumnName("created_by");
            entity.Property(u => u.UpdatedAt).HasColumnName("updated_at");
            entity.Property(u => u.UpdatedBy).HasColumnName("updated_by");

            entity.HasIndex(u => u.Username).IsUnique();
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => new { u.Id, u.ActiveSessionId }).HasDatabaseName("idx_tbl_users_session_lookup");

            // Audit relationships
            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(u => u.CreatedBy)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(u => u.UpdatedBy)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(u => u.Tokens)
                  .WithOne(t => t.User)
                  .HasForeignKey(t => t.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserToken>(entity =>
        {
            entity.ToTable("tbl_user_tokens");
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(t => t.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(t => t.SessionId).HasColumnName("session_id").IsRequired();
            entity.Property(t => t.RefreshToken).HasColumnName("refresh_token").HasMaxLength(500).IsRequired();
            entity.Property(t => t.DeviceName).HasColumnName("device_name").HasMaxLength(150);
            entity.Property(t => t.IpAddress).HasColumnName("ip_address").HasMaxLength(50);
            entity.Property(t => t.IsRevoked).HasColumnName("is_revoked").HasDefaultValue(false);
            entity.Property(t => t.ExpiresAt).HasColumnName("expires_at").IsRequired();
            entity.Property(t => t.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("clock_timestamp()");
            entity.Property(t => t.RevokedAt).HasColumnName("revoked_at");
            entity.Property(t => t.RevocationReason).HasColumnName("revocation_reason").HasMaxLength(100);

            entity.HasIndex(t => t.RefreshToken).IsUnique();
            entity.HasIndex(t => new { t.UserId, t.SessionId }).HasDatabaseName("idx_tbl_user_tokens_user_session");
        });

        // Employee Management entities integrated into the original authentication DbContext.
        modelBuilder.HasSequence<int>("employee_code_seq").StartsAt(1).IncrementsBy(1);

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.ToTable("Employees");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.EmployeeCode).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Salary).HasPrecision(12, 2);
            entity.Property(e => e.Version).HasColumnName("xmin").HasColumnType("xid")
                .ValueGeneratedOnAddOrUpdate().IsConcurrencyToken();
            entity.HasQueryFilter(e => e.IsActive);
        });

        modelBuilder.Entity<EmployeeDocument>(entity =>
        {
            entity.ToTable("EmployeeDocuments");
            entity.Property(d => d.DocumentType).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(d => new { d.EmployeeId, d.DocumentType }).IsUnique();
            entity.HasOne(d => d.Employee).WithMany(e => e.Documents)
                .HasForeignKey(d => d.EmployeeId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(d => d.Employee.IsActive);
        });

    }
}
