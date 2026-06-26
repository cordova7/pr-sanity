// Adversarial borderline: persistence bypass file 38
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService38
{
    private readonly OrderDbContext _context;

    public BypassService38(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
