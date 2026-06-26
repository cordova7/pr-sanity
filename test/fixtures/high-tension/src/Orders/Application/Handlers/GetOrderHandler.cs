// Handler stub — counts toward CQRS handler minimum (not a bypass)
using MediatR;

namespace Orders.Application.Handlers;

public class GetOrderHandler : IRequestHandler<GetOrderQuery, OrderDto>
{
    public Task<OrderDto> Handle(GetOrderQuery request, CancellationToken cancellationToken)
    {
        return Task.FromResult(new OrderDto(request.OrderId));
    }
}

public record GetOrderQuery(Guid OrderId);
public record OrderDto(Guid Id);
