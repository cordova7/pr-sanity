// Rule: repository interfaces in Application layer must not trigger persistence bypass.
namespace Orders.Application.Repositories;

public interface IOrderRepository
{
    Task<Order> GetById(int id);
}

public record Order(int Id);
