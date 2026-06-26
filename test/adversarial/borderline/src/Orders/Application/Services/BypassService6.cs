// Adversarial borderline: persistence bypass file 6
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService6
{
    private readonly OrderDbContext _context;

    public BypassService6(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
