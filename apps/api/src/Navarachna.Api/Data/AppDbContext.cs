using Microsoft.EntityFrameworkCore;
using Navarachna.Api.Common;
using Navarachna.Api.Entities;
using EmployeeApi.Models;
using Employee = EmployeeApi.Models.Employee;

namespace Navarachna.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserToken> UserTokens => Set<UserToken>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<EmployeeDocument> EmployeeDocuments => Set<EmployeeDocument>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<ReferenceCloth> ReferenceCloths => Set<ReferenceCloth>();

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

        modelBuilder.Entity<Expense>(entity =>
        {
            entity.ToTable("tbl_expenses");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(e => e.ExpenseDate).HasColumnName("expense_date");
            entity.Property(e => e.Amount).HasColumnName("amount").HasPrecision(12, 2);
            entity.Property(e => e.CategoryNotes).HasColumnName("category_notes").HasMaxLength(250).IsRequired();
            entity.Property(e => e.SourcingSpecialistIds)
                .HasColumnName("sourcing_specialist_ids")
                .HasColumnType("integer[]")
                .HasDefaultValueSql("ARRAY[]::integer[]")
                .IsRequired();
            entity.Property(e => e.BillBlobName).HasColumnName("bill_blob_name").HasMaxLength(300).IsRequired();
            entity.Property(e => e.BillFileName).HasColumnName("bill_file_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.BillContentType).HasColumnName("bill_content_type").HasMaxLength(100).IsRequired();

            // Audit Fields
            entity.Property(e => e.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("clock_timestamp()");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");

            // Soft delete
            entity.Property(e => e.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);
            entity.Property(e => e.DeletedBy).HasColumnName("deleted_by");
            entity.Property(e => e.DeletedAt).HasColumnName("deleted_at");
            entity.HasQueryFilter(e => !e.IsDeleted);

            entity.HasOne<User>().WithMany().HasForeignKey(e => e.CreatedBy).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.UpdatedBy).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<User>().WithMany().HasForeignKey(e => e.DeletedBy).OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.ExpenseDate).HasDatabaseName("idx_tbl_expenses_date");
            entity.HasIndex(e => e.CreatedBy).HasDatabaseName("idx_tbl_expenses_created_by");
        });

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.ToTable("Employees");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
            entity.Property(e => e.FirstName).HasColumnName("FirstName");
            entity.Property(e => e.LastName).HasColumnName("LastName");
            entity.Property(e => e.Email).HasColumnName("Email");
            entity.Property(e => e.Mobile).HasColumnName("Mobile");
            entity.Property(e => e.PanNumber).HasColumnName("PanNumber");
            entity.Property(e => e.AadhaarNumber).HasColumnName("AadhaarNumber");
            entity.Property(e => e.Department).HasColumnName("Department");
            entity.Property(e => e.Salary).HasColumnName("Salary").HasPrecision(12, 2);
            entity.Property(e => e.DateOfJoining).HasColumnName("DateOfJoining");
            entity.Property(e => e.IsActive).HasColumnName("IsActive");
            entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt");
            entity.Property(e => e.Version).HasColumnName("xmin").IsConcurrencyToken().ValueGeneratedOnAddOrUpdate();
            entity.HasIndex(e => e.Email).IsUnique();
        });

        modelBuilder.Entity<EmployeeDocument>(entity =>
        {
            entity.ToTable("EmployeeDocuments");
            entity.HasKey(document => document.Id);
            entity.Property(document => document.Id).ValueGeneratedOnAdd();
            entity.Property(document => document.DocumentType).HasMaxLength(20).HasConversion<string>();
            entity.HasIndex(document => new { document.EmployeeId, document.DocumentType }).IsUnique();
            entity.HasOne(document => document.Employee)
                .WithMany(employee => employee.Documents)
                .HasForeignKey(document => document.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Customer Management (exact schema match to Tailoring)
        modelBuilder.Entity<Customer>(entity =>
        {
            entity.ToTable("tbl_customers");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(c => c.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(c => c.MobileNumber).HasColumnName("mobile_number").HasMaxLength(15).IsRequired();
            entity.Property(c => c.WhatsappNumber).HasColumnName("whatsapp_number").HasMaxLength(15);
            entity.Property(c => c.AlternateMobile).HasColumnName("alternate_mobile").HasMaxLength(15);
            entity.Property(c => c.Address).HasColumnName("address");
            entity.Property(c => c.Area).HasColumnName("area").HasMaxLength(100);
            entity.Property(c => c.City).HasColumnName("city").HasMaxLength(100);
            entity.Property(c => c.Remarks).HasColumnName("remarks");
            entity.Property(c => c.ProfilePhotoUrl).HasColumnName("profile_photo_url").HasMaxLength(500);
            entity.Property(c => c.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            entity.Property(c => c.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
            entity.Property(c => c.CreatedBy).HasColumnName("created_by");
            entity.Property(c => c.UpdatedAt).HasColumnName("updated_at");
            entity.Property(c => c.UpdatedBy).HasColumnName("updated_by");

            entity.HasIndex(c => c.MobileNumber).HasDatabaseName("idx_customers_mobile");
            entity.HasIndex(c => c.Name).HasDatabaseName("idx_customers_name");
        });

        // Reference Cloths (exact schema match to Tailoring)
        modelBuilder.Entity<ReferenceCloth>(entity =>
        {
            entity.ToTable("tbl_reference_cloths");
            entity.HasKey(rc => rc.Id);
            entity.Property(rc => rc.Id).HasColumnName("id").ValueGeneratedOnAdd();
            entity.Property(rc => rc.OrderId).HasColumnName("order_id");
            entity.Property(rc => rc.OrderNumber).HasColumnName("order_number").HasMaxLength(50);
            entity.Property(rc => rc.CustomerId).HasColumnName("customer_id").IsRequired();
            entity.Property(rc => rc.ItemName).HasColumnName("item_name").HasMaxLength(150).IsRequired();
            entity.Property(rc => rc.StatusId).HasColumnName("status_id");
            entity.Property(rc => rc.StatusName).HasColumnName("status_name").HasMaxLength(100);
            entity.Property(rc => rc.ReceivedDate).HasColumnName("received_date");
            entity.Property(rc => rc.ReturnedDate).HasColumnName("returned_date");
            entity.Property(rc => rc.Remarks).HasColumnName("remarks");
            entity.Property(rc => rc.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

            entity.HasOne(rc => rc.Customer)
                  .WithMany(c => c.ReferenceCloths)
                  .HasForeignKey(rc => rc.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(rc => rc.CustomerId).HasDatabaseName("idx_reference_cloths_customer_id");
        });
    }
}
