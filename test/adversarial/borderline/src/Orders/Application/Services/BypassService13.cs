// Adversarial borderline: persistence bypass file 13
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService13
{
    private readonly OrderDbContext _context;

    public BypassService13(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
