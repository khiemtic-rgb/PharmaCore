using KitPlatform.Packs.Pharmacy.Inventory;

namespace KitPlatform.Application.Core.Engines;

/// <summary>
/// Core Inventory Engine — FEFO / batch allocation (NSF-INV, BR-INV-*).
/// Pilot: same behavior as <see cref="IBatchResolver"/>; new code should prefer this interface.
/// </summary>
public interface IInventoryEngine : IBatchResolver
{
}
