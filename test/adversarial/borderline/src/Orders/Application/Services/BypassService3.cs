// Adversarial borderline: persistence bypass file 3
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService3
{
    private readonly OrderDbContext _context;

    public BypassService3(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
