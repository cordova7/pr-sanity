// Adversarial borderline: persistence bypass file 1
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService1
{
    private readonly OrderDbContext _context;

    public BypassService1(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
