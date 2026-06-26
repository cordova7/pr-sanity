// Adversarial: single file mixing every health tension signal.
using System.ComponentModel.DataAnnotations;
using Ardalis.Result;
using ErrorOr;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class GodService
{
    private readonly AppDbContext _context;
    private readonly IOrderHandler _handler;
    private readonly IValidator<Order> _validator;

    [Required]
    public string Name { get; set; } = string.Empty;

    public GodService(AppDbContext context, IOrderHandler handler, IValidator<Order> validator)
    {
        _context = context;
        _handler = handler;
        _validator = validator;
    }

    public Result<Order> MethodA() => Result.Success(new Order(1));

    public ErrorOr<Order> MethodB() => new Order(2);

    public bool MethodC() => true;

    public Order MethodD() => _context.Set<Order>().First();
}

public class AppDbContext : DbContext
{
    public DbSet<Order> Orders => Set<Order>();
}

public interface IOrderHandler
{
    bool Handle(PlaceOrderCommand command);
}

public record Order(int Id);

public record PlaceOrderCommand;

public class OrderValidator : AbstractValidator<Order> { }
