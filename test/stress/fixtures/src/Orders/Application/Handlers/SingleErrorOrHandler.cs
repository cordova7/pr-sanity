// Companion for edge-case 3: single ErrorOr handler so layer-skip can be proven via analyzer.
using ErrorOr;

namespace Orders.Application.Handlers;

public class SingleErrorOrHandler
{
    public ErrorOr<bool> Handle() => true;
}
