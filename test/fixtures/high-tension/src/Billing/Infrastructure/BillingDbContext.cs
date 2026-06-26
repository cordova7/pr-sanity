// Correct layer — DbContext belongs in Infrastructure, not Application
using Microsoft.EntityFrameworkCore;

namespace Billing.Infrastructure;

public class BillingDbContext : DbContext
{
    public DbSet<Invoice> Invoices => Set<Invoice>();
}

public class Invoice
{
    public Guid Id { get; set; }
}
