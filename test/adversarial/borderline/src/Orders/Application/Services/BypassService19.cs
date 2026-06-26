// Adversarial borderline: persistence bypass file 19
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService19
{
    private readonly OrderDbContext _context;

    public BypassService19(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
