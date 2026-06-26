// Rule: Result<T> inside a string literal must not count as a result pattern.
namespace Orders.Application.Services;

public class OrderService
{
    public void Log()
    {
        var message = "Use Result<T> pattern";
    }
}
