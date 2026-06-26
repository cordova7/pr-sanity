// Adversarial borderline: persistence bypass file 5
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService5
{
    private readonly OrderDbContext _context;

    public BypassService5(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
