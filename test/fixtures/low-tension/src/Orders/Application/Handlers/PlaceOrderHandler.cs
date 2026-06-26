// Clean — IRequestHandler with Ardalis.Result only (single result pattern)
using Ardalis.Result;
using MediatR;

namespace Orders.Application.Handlers;

public class PlaceOrderHandler : IRequestHandler<PlaceOrderCommand, Result<OrderId>>
{
    private readonly IOrderRepository _orderRepository;

    public PlaceOrderHandler(IOrderRepository orderRepository)
    {
        _orderRepository = orderRepository;
    }

    public async Task<Result<OrderId>> Handle(PlaceOrderCommand request, CancellationToken cancellationToken)
    {
        var orderId = await _orderRepository.AddAsync(request, cancellationToken);
        return Result.Success(orderId);
    }
}

public record OrderId(Guid Value);
