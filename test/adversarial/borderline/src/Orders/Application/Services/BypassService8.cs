// Adversarial borderline: persistence bypass file 8
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService8
{
    private readonly OrderDbContext _context;

    public BypassService8(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
