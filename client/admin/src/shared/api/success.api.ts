import { http } from '@/shared/api/http';
import type { DashboardOverview } from '@/shared/api/dashboard.types';

export interface OwnerCockpit {
  overview: DashboardOverview;
  salesExtras: {
    monthNetTotal: number;
    weekOrderCount: number;
    monthOrderCount: number;
  };
  inventoryExtras: {
    nearExpirySkuCount: number;
    nearExpiryStockValue: number;
  };
  customers: {
    newCustomers7d: number;
    returningCustomers7d: number;
  };
  latestAssessment?: {
    submissionId: string;
    overallScore?: number | null;
    completedAt?: string | null;
    status: string;
  } | null;
}

type UnknownRow = Record<string, unknown>;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeOverview(row: UnknownRow): DashboardOverview {
  const sales = (row.sales ?? row.Sales ?? {}) as UnknownRow;
  const catalog = (row.catalog ?? row.Catalog ?? {}) as UnknownRow;
  const inventory = (row.inventory ?? row.Inventory ?? {}) as UnknownRow;
  const procurement = (row.procurement ?? row.Procurement ?? {}) as UnknownRow;
  const o2o = (row.o2o ?? row.O2o ?? {}) as UnknownRow;
  return {
    sales: {
      todayNetTotal: num(sales.todayNetTotal ?? sales.TodayNetTotal),
      weekNetTotal: num(sales.weekNetTotal ?? sales.WeekNetTotal),
      todayOrderCount: num(sales.todayOrderCount ?? sales.TodayOrderCount),
    },
    catalog: {
      productCount: num(catalog.productCount ?? catalog.ProductCount),
      customerCount: num(catalog.customerCount ?? catalog.CustomerCount),
    },
    inventory: {
      activeBatchCount: num(inventory.activeBatchCount ?? inventory.ActiveBatchCount),
      nearExpiryBatchCount: num(inventory.nearExpiryBatchCount ?? inventory.NearExpiryBatchCount),
      lowStockBatchCount: num(inventory.lowStockBatchCount ?? inventory.LowStockBatchCount),
      lowStockProductCount: num(inventory.lowStockProductCount ?? inventory.LowStockProductCount),
      expiryDays: num(inventory.expiryDays ?? inventory.ExpiryDays) || 30,
    },
    procurement: {
      pendingReceiptCount: num(procurement.pendingReceiptCount ?? procurement.PendingReceiptCount),
    },
    o2o: {
      draftOrdersAwaitingCount: num(o2o.draftOrdersAwaitingCount ?? o2o.DraftOrdersAwaitingCount),
      reservationsAwaitingCount: num(o2o.reservationsAwaitingCount ?? o2o.ReservationsAwaitingCount),
      chatUnreadCount: num(o2o.chatUnreadCount ?? o2o.ChatUnreadCount),
    },
  };
}

export async function fetchOwnerCockpit(params?: {
  expiryDays?: number;
  lowStockThreshold?: number;
}): Promise<OwnerCockpit> {
  const { data } = await http.get<UnknownRow>('/success/owner-cockpit', { params });
  const row = data as UnknownRow;
  const salesExtras = (row.salesExtras ?? row.SalesExtras ?? {}) as UnknownRow;
  const inventoryExtras = (row.inventoryExtras ?? row.InventoryExtras ?? {}) as UnknownRow;
  const customers = (row.customers ?? row.Customers ?? {}) as UnknownRow;
  const assessment = (row.latestAssessment ?? row.LatestAssessment) as UnknownRow | null | undefined;

  return {
    overview: normalizeOverview((row.overview ?? row.Overview ?? {}) as UnknownRow),
    salesExtras: {
      monthNetTotal: num(salesExtras.monthNetTotal ?? salesExtras.MonthNetTotal),
      weekOrderCount: num(salesExtras.weekOrderCount ?? salesExtras.WeekOrderCount),
      monthOrderCount: num(salesExtras.monthOrderCount ?? salesExtras.MonthOrderCount),
    },
    inventoryExtras: {
      nearExpirySkuCount: num(inventoryExtras.nearExpirySkuCount ?? inventoryExtras.NearExpirySkuCount),
      nearExpiryStockValue: num(
        inventoryExtras.nearExpiryStockValue ?? inventoryExtras.NearExpiryStockValue,
      ),
    },
    customers: {
      newCustomers7d: num(customers.newCustomers7d ?? customers.NewCustomers7d),
      returningCustomers7d: num(customers.returningCustomers7d ?? customers.ReturningCustomers7d),
    },
    latestAssessment: assessment
      ? {
          submissionId: String(assessment.submissionId ?? assessment.SubmissionId ?? ''),
          overallScore:
            assessment.overallScore == null && assessment.OverallScore == null
              ? null
              : num(assessment.overallScore ?? assessment.OverallScore),
          completedAt: (assessment.completedAt ?? assessment.CompletedAt) as string | null | undefined,
          status: String(assessment.status ?? assessment.Status ?? ''),
        }
      : null,
  };
}
