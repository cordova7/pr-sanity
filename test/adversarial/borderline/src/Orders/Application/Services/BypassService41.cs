// Adversarial borderline: persistence bypass file 41
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService41
{
    private readonly OrderDbContext _context;

    public BypassService41(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
