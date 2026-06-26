// Adversarial borderline: persistence bypass file 29
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService29
{
    private readonly OrderDbContext _context;

    public BypassService29(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
