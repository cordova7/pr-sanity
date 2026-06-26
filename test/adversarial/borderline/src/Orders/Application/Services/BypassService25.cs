// Adversarial borderline: persistence bypass file 25
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService25
{
    private readonly OrderDbContext _context;

    public BypassService25(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
