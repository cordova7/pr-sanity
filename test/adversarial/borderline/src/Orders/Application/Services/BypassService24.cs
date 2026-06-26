// Adversarial borderline: persistence bypass file 24
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService24
{
    private readonly OrderDbContext _context;

    public BypassService24(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
