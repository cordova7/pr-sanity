// Adversarial borderline: persistence bypass file 20
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService20
{
    private readonly OrderDbContext _context;

    public BypassService20(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
