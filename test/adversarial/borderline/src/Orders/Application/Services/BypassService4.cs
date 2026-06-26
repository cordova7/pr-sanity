// Adversarial borderline: persistence bypass file 4
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService4
{
    private readonly OrderDbContext _context;

    public BypassService4(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
