using System.Data;
using System.Text.Json;
using Dapper;

namespace KitPlatform.Packs.Pharmacy.Infrastructure;

/// <summary>Phase D dual-write — <c>pack_pharmacy.pharmacy_sales_order</c> on completed sale.</summary>
internal static class PharmacySalesOrderWriter
{
    public static async Task EnsureCompletedSaleAsync(
        IDbConnection conn,
        IDbTransaction tx,
        Guid tenantId,
        Guid? workspaceId,
        Guid salesOrderId,
        string orderNumber,
        Guid? customerId,
        short orderStatus,
        decimal totalAmount,
        DateTime? completedAt,
        Guid? actorUserId = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO pack_pharmacy.pharmacy_sales_order (
                tenant_id, workspace_id, sales_order_id, customer_id, order_number,
                order_status, total_amount, completed_at, created_by, metadata
            )
            VALUES (
                @TenantId, @WorkspaceId, @SalesOrderId, @CustomerId, @OrderNumber,
                @OrderStatus, @TotalAmount, @CompletedAt, @ActorUserId, @Metadata::jsonb
            )
            ON CONFLICT (tenant_id, sales_order_id) DO UPDATE SET
                customer_id = EXCLUDED.customer_id,
                order_number = EXCLUDED.order_number,
                order_status = EXCLUDED.order_status,
                total_amount = EXCLUDED.total_amount,
                completed_at = COALESCE(EXCLUDED.completed_at, pack_pharmacy.pharmacy_sales_order.completed_at),
                workspace_id = COALESCE(pack_pharmacy.pharmacy_sales_order.workspace_id, EXCLUDED.workspace_id),
                updated_at = NOW(),
                updated_by = EXCLUDED.created_by,
                metadata = pack_pharmacy.pharmacy_sales_order.metadata || EXCLUDED.metadata
            """;

        var metadata = JsonSerializer.Serialize(new { source = "sales_write_cutover" });

        await conn.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = tenantId,
            WorkspaceId = workspaceId,
            SalesOrderId = salesOrderId,
            CustomerId = customerId,
            OrderNumber = orderNumber,
            OrderStatus = orderStatus,
            TotalAmount = totalAmount,
            CompletedAt = completedAt,
            ActorUserId = actorUserId,
            Metadata = metadata,
        }, tx, cancellationToken: cancellationToken));
    }
}
