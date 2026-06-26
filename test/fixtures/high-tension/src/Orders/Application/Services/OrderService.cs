// Tension: cqrs-bypass — calls handler directly instead of via IMediator
namespace Orders.Application.Services;

public class OrderService
{
    private readonly PlaceOrderHandler _handler;

    public OrderService(PlaceOrderHandler handler)
    {
        _handler = handler;
    }

    public async Task PlaceOrderAsync(PlaceOrderCommand command)
    {
        await _handler.Handle(command, CancellationToken.None);
    }
}
