// Adversarial borderline: persistence bypass file 32
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService32
{
    private readonly OrderDbContext _context;

    public BypassService32(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
