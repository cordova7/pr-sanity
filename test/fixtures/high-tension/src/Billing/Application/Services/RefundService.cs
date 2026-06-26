// Tension: persistence-bypass — contributes to >30% bypass rate for critical severity
using Microsoft.EntityFrameworkCore;

namespace Billing.Application.Services;

public class RefundService
{
    private readonly BillingDbContext _context;

    public RefundService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task RefundAsync(Guid refundId)
    {
        var refund = await _context.Set<Refund>().FindAsync(refundId);
        _context.SaveChanges();
    }
}

public class Refund { }
