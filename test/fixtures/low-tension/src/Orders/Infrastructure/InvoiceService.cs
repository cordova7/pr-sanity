// False-positive guard — Infrastructure DbContext must not count as persistence bypass
using Microsoft.EntityFrameworkCore;

namespace Orders.Infrastructure;

public class InvoiceService
{
    private readonly OrderDbContext _context;

    public InvoiceService(OrderDbContext context)
    {
        _context = context;
    }

    public async Task<bool> ArchiveInvoiceAsync(Guid invoiceId, CancellationToken cancellationToken)
    {
        var invoice = await _context.Orders.FindAsync([invoiceId], cancellationToken);
        if (invoice is null)
        {
            return false;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
