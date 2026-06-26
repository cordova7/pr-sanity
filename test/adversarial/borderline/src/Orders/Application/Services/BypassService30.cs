// Adversarial borderline: persistence bypass file 30
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService30
{
    private readonly OrderDbContext _context;

    public BypassService30(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
