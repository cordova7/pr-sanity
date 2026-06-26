// Adversarial borderline: persistence bypass file 10
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService10
{
    private readonly OrderDbContext _context;

    public BypassService10(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
