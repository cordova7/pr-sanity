// Rule: Ardalis.Result mentioned only in a comment must not count as usage.
// We used to use Ardalis.Result here
namespace Orders.Application.Services;

public class OrderService
{
    public bool Handle() => true;
}
