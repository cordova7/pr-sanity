// Rule: injecting IOrderRepository (correct pattern) must not trigger persistence bypass.
namespace Orders.Application.Services;

public class OrderService
{
    private readonly IOrderRepository _repository;

    public OrderService(IOrderRepository repository)
    {
        _repository = repository;
    }
}

public interface IOrderRepository
{
    Task<object> GetById(int id);
}
