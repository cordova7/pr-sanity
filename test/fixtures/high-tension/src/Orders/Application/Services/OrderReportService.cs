// Tension: cqrs-bypass — direct .Execute() call on injected handler
namespace Orders.Application.Services;

public class OrderReportService
{
    private readonly ListOrdersHandler _listOrdersHandler;

    public OrderReportService(ListOrdersHandler listOrdersHandler)
    {
        _listOrdersHandler = listOrdersHandler;
    }

    public async Task GenerateReportAsync()
    {
        await _listOrdersHandler.Execute(new ListOrdersQuery());
    }
}

public record ListOrdersQuery;
