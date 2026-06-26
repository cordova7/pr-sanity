// Adversarial borderline: persistence bypass file 11
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService11
{
    private readonly OrderDbContext _context;

    public BypassService11(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
