// Tension: persistence-bypass — contributes to >30% bypass rate for critical severity
using Microsoft.EntityFrameworkCore;

namespace Billing.Application.Services;

public class BillingArchiveService
{
    private readonly BillingDbContext _context;

    public BillingArchiveService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task ArchiveAsync(Guid archiveId)
    {
        var archive = await _context.Set<Archive>().FindAsync(archiveId);
        _context.SaveChanges();
    }
}

public class Archive { }
