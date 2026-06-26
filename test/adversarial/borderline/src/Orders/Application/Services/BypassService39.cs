// Adversarial borderline: persistence bypass file 39
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService39
{
    private readonly OrderDbContext _context;

    public BypassService39(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
