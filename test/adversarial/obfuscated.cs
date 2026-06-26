// Adversarial: type aliases may hide library names from naive string matching.
using AR = Ardalis.Result;
using EO = ErrorOr;

namespace Orders.Application.Services;

public class TrickyService
{
    public AR.Result<Order> GetOrder() => AR.Result.Success(new Order());

    public EO.ErrorOr<Order> GetOrderV2() => new Order();
}

public record Order(int Id);
