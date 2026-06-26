// Tension: result-pattern — ErrorOr return type (competing pattern)
using ErrorOr;
using MediatR;

namespace Shared.Application.Handlers;

public class GetReportHandler : IRequestHandler<GetReportQuery, ErrorOr<Report>>
{
    public Task<ErrorOr<Report>> Handle(GetReportQuery request, CancellationToken cancellationToken)
    {
        return Task.FromResult<ErrorOr<Report>>(new Report("summary"));
    }
}

public record GetReportQuery(string Name);
public record Report(string Summary);
