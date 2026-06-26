// Adversarial borderline: persistence bypass file 15
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService15
{
    private readonly OrderDbContext _context;

    public BypassService15(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
