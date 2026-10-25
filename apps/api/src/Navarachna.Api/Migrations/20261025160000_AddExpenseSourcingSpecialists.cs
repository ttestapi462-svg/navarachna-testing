using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Navarachna.Api.Data;

#nullable disable

namespace Navarachna.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261025160000_AddExpenseSourcingSpecialists")]
public partial class AddExpenseSourcingSpecialists : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int[]>(
            name: "sourcing_specialist_ids",
            table: "tbl_expenses",
            type: "integer[]",
            nullable: false,
            defaultValueSql: "ARRAY[]::integer[]");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "sourcing_specialist_ids",
            table: "tbl_expenses");
    }
}
