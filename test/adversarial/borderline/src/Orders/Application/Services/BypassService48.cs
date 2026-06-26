// Adversarial borderline: persistence bypass file 48
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService48
{
    private readonly OrderDbContext _context;

    public BypassService48(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
