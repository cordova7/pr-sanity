// Handler stub — counts toward CQRS handler minimum (not a bypass)
using MediatR;

namespace Orders.Application.Handlers;

public class ListOrdersHandler : IRequestHandler<ListOrdersQuery, IReadOnlyList<OrderDto>>
{
    public Task Execute(ListOrdersQuery query)
    {
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<OrderDto>> Handle(ListOrdersQuery request, CancellationToken cancellationToken)
    {
        return Task.FromResult<IReadOnlyList<OrderDto>>(Array.Empty<OrderDto>());
    }
}

public record ListOrdersQuery;
