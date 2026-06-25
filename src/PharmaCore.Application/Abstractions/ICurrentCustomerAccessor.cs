namespace PharmaCore.Application.Abstractions;

/// <summary>Đọc ngữ cảnh khách hàng từ JWT app (claim token_type=customer_app).</summary>
public interface ICurrentCustomerAccessor
{
    bool IsCustomer { get; }

    Guid CustomerAccountId { get; }

    Guid CustomerId { get; }

    Guid TenantId { get; }
}
