// Adversarial borderline: persistence bypass file 7
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService7
{
    private readonly OrderDbContext _context;

    public BypassService7(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
