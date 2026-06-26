// Adversarial borderline: persistence bypass file 12
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService12
{
    private readonly OrderDbContext _context;

    public BypassService12(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
