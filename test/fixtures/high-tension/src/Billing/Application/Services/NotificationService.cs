// Tension: persistence-bypass — contributes to >30% bypass rate for critical severity
using Microsoft.EntityFrameworkCore;

namespace Billing.Application.Services;

public class NotificationService
{
    private readonly BillingDbContext _context;

    public NotificationService(BillingDbContext context)
    {
        _context = context;
    }

    public async Task SendAsync(Guid notificationId)
    {
        var notification = await _context.Set<Notification>().FindAsync(notificationId);
        _context.SaveChanges();
    }
}

public class Notification { }
