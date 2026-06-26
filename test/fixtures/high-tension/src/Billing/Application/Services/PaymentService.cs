// Tension: persistence-bypass — Application layer accesses DbContext directly
using Microsoft.EntityFrameworkCore;

namespace Billing.Application.Services;

public class PaymentService
{
    private readonly BillingDbContext _context;

    public PaymentService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task ProcessPaymentAsync(Guid paymentId)
    {
        var payment = await _context.Set<Payment>().FindAsync(paymentId);
        _context.SaveChanges();
    }
}

public class Payment { }
