// Tension: validation-strategy — DataAnnotations validation
using System.ComponentModel.DataAnnotations;

namespace Orders.Application.Commands;

public class PlaceOrderCommand
{
    [Required]
    public string ProductName { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int Quantity { get; set; }
}
