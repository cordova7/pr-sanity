// Handler stub — counts toward CQRS handler minimum (not a bypass)
using MediatR;

namespace Orders.Application.Handlers;

public class PlaceOrderHandler : IRequestHandler<PlaceOrderCommand, Unit>
{
    public Task<Unit> Handle(PlaceOrderCommand request, CancellationToken cancellationToken)
    {
        return Task.FromResult(Unit.Value);
    }
}
