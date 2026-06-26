// Tension: persistence-bypass — DbContext field/ctor only (no _context. or .Set< heuristics)
using Microsoft.EntityFrameworkCore;

namespace Billing.Application.Services;

public class DbContextOnlyService
{
    private readonly DbContext _store;

    public DbContextOnlyService(DbContext store)
    {
        _store = store;
    }

    public bool IsConfigured() => _store.Database.CanConnect();
}
