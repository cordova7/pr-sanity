// False-positive guard — hosted services must not count as CQRS bypass
using Microsoft.Extensions.Hosting;

namespace Orders.Application.Workers;

public class OrderCleanupHostedService : BackgroundService
{
    private readonly PlaceOrderHandler _handler;

    public OrderCleanupHostedService(PlaceOrderHandler handler)
    {
        _handler = handler;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _handler.Handle(new PlaceOrderCommand(), stoppingToken);
    }
}

public class PlaceOrderCommand
{
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
}

public class PlaceOrderHandler
{
    public Task Handle(PlaceOrderCommand request, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
