// Adversarial borderline: persistence bypass file 22
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService22
{
    private readonly OrderDbContext _context;

    public BypassService22(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
