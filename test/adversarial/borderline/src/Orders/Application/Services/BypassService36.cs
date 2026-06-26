// Adversarial borderline: persistence bypass file 36
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService36
{
    private readonly OrderDbContext _context;

    public BypassService36(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
