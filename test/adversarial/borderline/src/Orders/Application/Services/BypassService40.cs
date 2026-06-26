// Adversarial borderline: persistence bypass file 40
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService40
{
    private readonly OrderDbContext _context;

    public BypassService40(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
