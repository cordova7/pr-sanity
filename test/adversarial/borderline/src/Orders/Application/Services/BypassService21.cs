// Adversarial borderline: persistence bypass file 21
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService21
{
    private readonly OrderDbContext _context;

    public BypassService21(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
