// False-positive guard — DTO bool methods must not count as result-pattern raw bool
namespace Orders.Application.Dtos;

public class OrderSummaryDto
{
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }

    public bool IsValid() => !string.IsNullOrWhiteSpace(ProductName) && Quantity > 0;

    public bool HandleValidation() => IsValid();
}
