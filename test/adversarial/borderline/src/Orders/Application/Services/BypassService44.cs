// Adversarial borderline: persistence bypass file 44
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService44
{
    private readonly OrderDbContext _context;

    public BypassService44(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
