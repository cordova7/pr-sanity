// Adversarial borderline: persistence bypass file 23
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService23
{
    private readonly OrderDbContext _context;

    public BypassService23(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
