// Adversarial borderline: persistence bypass file 43
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService43
{
    private readonly OrderDbContext _context;

    public BypassService43(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
