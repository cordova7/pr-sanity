// Adversarial borderline: persistence bypass file 33
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService33
{
    private readonly OrderDbContext _context;

    public BypassService33(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
