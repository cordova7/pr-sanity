// Tension: validation-strategy — manual validation via ModelState null check (no FluentValidation)
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Billing.Application.Commands;

public class CreateInvoiceCommand
{
    public string? CustomerName { get; set; }
}

public class CreateInvoiceCommandHandler
{
    public bool Handle(CreateInvoiceCommand command, ModelStateDictionary modelState)
    {
        if (command.CustomerName == null)
        {
            modelState.AddModelError(nameof(command.CustomerName), "Customer name is required.");
            return false;
        }

        return true;
    }
}
