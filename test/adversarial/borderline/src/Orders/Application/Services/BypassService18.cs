// Adversarial borderline: persistence bypass file 18
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService18
{
    private readonly OrderDbContext _context;

    public BypassService18(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
