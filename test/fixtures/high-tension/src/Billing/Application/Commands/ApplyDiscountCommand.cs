// Tension: validation-strategy — FluentValidation (third strategy alongside manual + DataAnnotations)
using FluentValidation;

namespace Billing.Application.Commands;

public class ApplyDiscountCommand
{
    public decimal Amount { get; set; }
}

public class ApplyDiscountCommandValidator : AbstractValidator<ApplyDiscountCommand>
{
    public ApplyDiscountCommandValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0);
    }
}
