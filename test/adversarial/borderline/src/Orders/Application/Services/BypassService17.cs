// Adversarial borderline: persistence bypass file 17
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService17
{
    private readonly OrderDbContext _context;

    public BypassService17(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
