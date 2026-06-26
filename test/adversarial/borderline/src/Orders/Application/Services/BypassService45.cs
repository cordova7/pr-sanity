// Adversarial borderline: persistence bypass file 45
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService45
{
    private readonly OrderDbContext _context;

    public BypassService45(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
