// Adversarial borderline: persistence bypass file 26
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService26
{
    private readonly OrderDbContext _context;

    public BypassService26(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
