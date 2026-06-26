// Tension: result-pattern — Ardalis.Result return type (competing pattern)
using Ardalis.Result;
using MediatR;

namespace Shared.Application.Handlers;

public class GetSummaryHandler : IRequestHandler<GetSummaryQuery, Result<Summary>>
{
    public Task<Result<Summary>> Handle(GetSummaryQuery request, CancellationToken cancellationToken)
    {
        return Task.FromResult(Result.Success(new Summary("total")));
    }
}

public record GetSummaryQuery;
public record Summary(string Total);
