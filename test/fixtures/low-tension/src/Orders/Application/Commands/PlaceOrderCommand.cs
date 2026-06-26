// Clean — FluentValidation only (single validation strategy)
using FluentValidation;

namespace Orders.Application.Commands;

public class PlaceOrderCommand
{
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
}

public class PlaceOrderCommandValidator : AbstractValidator<PlaceOrderCommand>
{
    public PlaceOrderCommandValidator()
    {
        RuleFor(x => x.ProductName).NotEmpty();
        RuleFor(x => x.Quantity).GreaterThan(0);
    }
}
