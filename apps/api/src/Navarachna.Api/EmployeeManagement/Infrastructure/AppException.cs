namespace EmployeeApi.Infrastructure;

public class AppException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}