using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Navarachna.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence(
                name: "customer_code_seq",
                startValue: 1001L);

            migrationBuilder.CreateTable(
                name: "tbl_customers",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    mobile_number = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: false),
                    whatsapp_number = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true),
                    alternate_mobile = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    area = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    remarks = table.Column<string>(type: "text", nullable: true),
                    profile_photo_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_customers", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tbl_reference_cloths",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    order_id = table.Column<long>(type: "bigint", nullable: true),
                    order_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    customer_id = table.Column<long>(type: "bigint", nullable: false),
                    item_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    status_id = table.Column<long>(type: "bigint", nullable: true),
                    status_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    received_date = table.Column<DateOnly>(type: "date", nullable: true),
                    returned_date = table.Column<DateOnly>(type: "date", nullable: true),
                    remarks = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbl_reference_cloths", x => x.id);
                    table.ForeignKey(
                        name: "FK_tbl_reference_cloths_tbl_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "tbl_customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "idx_customers_mobile",
                table: "tbl_customers",
                column: "mobile_number");

            migrationBuilder.CreateIndex(
                name: "idx_customers_name",
                table: "tbl_customers",
                column: "name");

            migrationBuilder.CreateIndex(
                name: "tbl_customers_code_key",
                table: "tbl_customers",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_reference_cloths_customer_id",
                table: "tbl_reference_cloths",
                column: "customer_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tbl_reference_cloths");

            migrationBuilder.DropTable(
                name: "tbl_customers");

            migrationBuilder.DropSequence(
                name: "customer_code_seq");
        }
    }
}
