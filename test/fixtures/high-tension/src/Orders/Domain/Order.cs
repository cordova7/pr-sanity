namespace Orders.Domain;

public class Order
{
    public Guid Id { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
}
