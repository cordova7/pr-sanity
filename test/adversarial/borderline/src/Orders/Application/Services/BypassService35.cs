// Adversarial borderline: persistence bypass file 35
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService35
{
    private readonly OrderDbContext _context;

    public BypassService35(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
