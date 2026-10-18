namespace Navarachna.Api.Common;

public interface IAuditableEntity
{
    DateTime CreatedAt { get; set; }
    long? CreatedBy { get; set; }
    DateTime? UpdatedAt { get; set; }
    long? UpdatedBy { get; set; }
}
