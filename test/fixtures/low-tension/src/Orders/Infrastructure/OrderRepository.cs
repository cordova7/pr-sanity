// Clean — DbContext correctly isolated in Infrastructure layer
using Microsoft.EntityFrameworkCore;

namespace Orders.Infrastructure;

public class OrderRepository : IOrderRepository
{
    private readonly OrderDbContext _context;

    public OrderRepository(OrderDbContext context)
    {
        _context = context;
    }

    public async Task<OrderId> AddAsync(PlaceOrderCommand command, CancellationToken cancellationToken)
    {
        var order = new Order { ProductName = command.ProductName, Quantity = command.Quantity };
        _context.Orders.Add(order);
        await _context.SaveChangesAsync(cancellationToken);
        return new OrderId(order.Id);
    }
}

public class OrderDbContext : DbContext
{
    public DbSet<Order> Orders => Set<Order>();
}

public class Order
{
    public Guid Id { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
}

public record OrderId(Guid Value);

public class PlaceOrderCommand
{
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
}

public interface IOrderRepository
{
    Task<OrderId> AddAsync(PlaceOrderCommand command, CancellationToken cancellationToken);
}
