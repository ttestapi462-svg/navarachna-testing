using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Navarachna.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialAuthAndSingleSessionWithAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tbl_users",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    password_hash = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    first_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    last_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    phone_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    is_locked = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    failed_login_attempts = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    lockout_until = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    active_session_id = table.Column<Guid>(type: "uuid", nullable: true),
                    active_device_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    session_started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_login_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "clock_timestamp()"),
                    created_by = table.Column<long>(type: "bigint", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_by = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_users", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_users_tbl_users_created_by",
                        column: x => x.created_by,
                        principalTable: "tbl_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tbl_users_tbl_users_updated_by",
                        column: x => x.updated_by,
                        principalTable: "tbl_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tbl_user_tokens",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    refresh_token = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    device_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    ip_address = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    is_revoked = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "clock_timestamp()"),
                    revoked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    revocation_reason = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_user_tokens", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_user_tokens_tbl_users_user_id",
                        column: x => x.user_id,
                        principalTable: "tbl_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_tbl_user_tokens_user_session",
                table: "tbl_user_tokens",
                columns: new[] { "user_id", "session_id" });

            migrationBuilder.CreateIndex(
                name: "IX_tbl_user_tokens_refresh_token",
                table: "tbl_user_tokens",
                column: "refresh_token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_tbl_users_session_lookup",
                table: "tbl_users",
                columns: new[] { "id", "active_session_id" });

            migrationBuilder.CreateIndex(
                name: "IX_tbl_users_created_by",
                table: "tbl_users",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_users_email",
                table: "tbl_users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tbl_users_updated_by",
                table: "tbl_users",
                column: "updated_by");

            migrationBuilder.CreateIndex(
                name: "IX_tbl_users_username",
                table: "tbl_users",
                column: "username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tbl_user_tokens");

            migrationBuilder.DropTable(
                name: "tbl_users");
        }
    }
}
