// Adversarial borderline: persistence bypass file 46
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService46
{
    private readonly OrderDbContext _context;

    public BypassService46(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
