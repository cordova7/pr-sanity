// Rule: DbContext inside a log message string must not trigger persistence bypass.
namespace Orders.Application.Services;

public class OrderService
{
    private readonly ILogger<OrderService> _logger;

    public OrderService(ILogger<OrderService> logger)
    {
        _logger = logger;
    }

    public void LogTimeout()
    {
        _logger.LogError("DbContext timeout in {Service}", nameof(OrderService));
    }
}

public interface ILogger<T> { void LogError(string template, object arg); }
