namespace KitPlatform.Application.CustomerApp;

public sealed record CustomerProductSearchItemDto(
    Guid Id,
    string ProductCode,
    string ProductName,
    string? GenericName,
    string? SaleUnitName);

public sealed record CustomerProductSearchResult(
    IReadOnlyList<CustomerProductSearchItemDto> Items,
    int Total,
    int Page,
    int PageSize);
