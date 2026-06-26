// Adversarial borderline: persistence bypass file 16
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService16
{
    private readonly OrderDbContext _context;

    public BypassService16(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
