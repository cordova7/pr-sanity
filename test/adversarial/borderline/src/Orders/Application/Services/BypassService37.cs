// Adversarial borderline: persistence bypass file 37
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService37
{
    private readonly OrderDbContext _context;

    public BypassService37(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
