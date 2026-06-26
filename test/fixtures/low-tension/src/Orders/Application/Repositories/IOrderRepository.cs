// Clean — repository interface in Application layer
namespace Orders.Application.Repositories;

public interface IOrderRepository
{
    Task<OrderId> AddAsync(PlaceOrderCommand command, CancellationToken cancellationToken);
}

public record OrderId(Guid Value);
