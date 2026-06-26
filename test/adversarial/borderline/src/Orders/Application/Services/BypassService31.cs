// Adversarial borderline: persistence bypass file 31
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService31
{
    private readonly OrderDbContext _context;

    public BypassService31(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
