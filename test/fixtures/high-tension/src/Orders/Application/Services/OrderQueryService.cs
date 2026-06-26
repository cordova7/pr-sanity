// Tension: cqrs-bypass — concrete handler injected in constructor (not IMediator)
namespace Orders.Application.Services;

public class OrderQueryService
{
    private readonly GetOrderHandler _getOrderHandler;

    public OrderQueryService(GetOrderHandler getOrderHandler)
    {
        _getOrderHandler = getOrderHandler;
    }

    public async Task GetOrderAsync(Guid orderId)
    {
        await _getOrderHandler.Handle(new GetOrderQuery(orderId), CancellationToken.None);
    }
}

public record GetOrderQuery(Guid OrderId);
