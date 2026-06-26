// Adversarial borderline: persistence bypass file 9
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService9
{
    private readonly OrderDbContext _context;

    public BypassService9(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
