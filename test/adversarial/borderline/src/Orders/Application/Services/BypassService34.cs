// Adversarial borderline: persistence bypass file 34
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService34
{
    private readonly OrderDbContext _context;

    public BypassService34(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
