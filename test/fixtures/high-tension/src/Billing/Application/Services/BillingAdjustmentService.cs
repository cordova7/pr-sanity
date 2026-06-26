// Tension: persistence-bypass — contributes to >30% bypass rate for critical severity
using Microsoft.EntityFrameworkCore;

namespace Billing.Application.Services;

public class BillingAdjustmentService
{
    private readonly BillingDbContext _context;

    public BillingAdjustmentService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task AdjustAsync(Guid adjustmentId)
    {
        var adjustment = await _context.Set<Adjustment>().FindAsync(adjustmentId);
        _context.SaveChanges();
    }
}

public class Adjustment { }
