// Tension: persistence-bypass + result-pattern — DbContext in Application layer + raw bool return
using Microsoft.EntityFrameworkCore;

namespace Billing.Application.Services;

public class InvoiceService
{
    private readonly BillingDbContext _context;

    public InvoiceService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task<bool> ProcessInvoiceAsync()
    {
        var invoices = _context.Set<Invoice>();
        return await invoices.AnyAsync();
    }
}

public class Invoice { }
