// Adversarial borderline: persistence bypass file 2
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService2
{
    private readonly OrderDbContext _context;

    public BypassService2(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
