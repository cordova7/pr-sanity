// Adversarial borderline: persistence bypass file 47
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService47
{
    private readonly OrderDbContext _context;

    public BypassService47(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
