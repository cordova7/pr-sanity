// Adversarial borderline: persistence bypass file 27
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService27
{
    private readonly OrderDbContext _context;

    public BypassService27(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
