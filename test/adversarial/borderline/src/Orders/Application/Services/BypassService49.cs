// Adversarial borderline: persistence bypass file 49
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService49
{
    private readonly OrderDbContext _context;

    public BypassService49(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
