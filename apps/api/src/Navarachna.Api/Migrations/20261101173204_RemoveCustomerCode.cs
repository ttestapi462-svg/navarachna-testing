using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Navarachna.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCustomerCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "tbl_customers_code_key",
                table: "tbl_customers");

            migrationBuilder.DropColumn(
                name: "code",
                table: "tbl_customers");

            migrationBuilder.DropSequence(
                name: "customer_code_seq");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence(
                name: "customer_code_seq",
                startValue: 1001L);

            migrationBuilder.AddColumn<string>(
                name: "code",
                table: "tbl_customers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "tbl_customers_code_key",
                table: "tbl_customers",
                column: "code",
                unique: true);
        }
    }
}
