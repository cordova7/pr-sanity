// Adversarial borderline: persistence bypass file 28
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService28
{
    private readonly OrderDbContext _context;

    public BypassService28(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
