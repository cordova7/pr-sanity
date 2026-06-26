// Adversarial borderline: persistence bypass file 42
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService42
{
    private readonly OrderDbContext _context;

    public BypassService42(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
