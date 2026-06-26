// Rule: DbContext mentioned only in a comment must not trigger persistence bypass.
// We removed DbContext dependency here
namespace Orders.Application.Services;

public class OrderService : IOrderService
{
    public Task HandleAsync() => Task.CompletedTask;
}

public interface IOrderService
{
    Task HandleAsync();
}
