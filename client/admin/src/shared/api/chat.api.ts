import { http } from '@/shared/api/http';

export interface AdminChatThread {
  threadId: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerPhone: string | null;
  staffUnreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
}

export interface AdminChatMessage {
  id: string;
  senderType: number;
  senderName: string | null;
  body: string;
  createdAt: string;
  readAt: string | null;
}

function normalizeMessage(row: Record<string, unknown>): AdminChatMessage {
  return {
    id: String(row.id ?? row.Id),
    senderType: Number(row.senderType ?? row.SenderType ?? 1),
    senderName: (row.senderName ?? row.SenderName) as string | null,
    body: String(row.body ?? row.Body ?? ''),
    createdAt: String(row.createdAt ?? row.CreatedAt ?? ''),
    readAt: (row.readAt ?? row.ReadAt) as string | null,
  };
}

function normalizeThread(row: Record<string, unknown>): AdminChatThread {
  return {
    threadId: String(row.threadId ?? row.ThreadId),
    customerId: String(row.customerId ?? row.CustomerId),
    customerCode: String(row.customerCode ?? row.CustomerCode ?? ''),
    customerName: String(row.customerName ?? row.CustomerName ?? ''),
    customerPhone: (row.customerPhone ?? row.CustomerPhone) as string | null,
    staffUnreadCount: Number(row.staffUnreadCount ?? row.StaffUnreadCount ?? 0),
    lastMessageAt: (row.lastMessageAt ?? row.LastMessageAt) as string | null,
    lastMessagePreview: (row.lastMessagePreview ?? row.LastMessagePreview) as string | null,
  };
}

export async function fetchChatThreads() {
  const { data } = await http.get<{ items?: Record<string, unknown>[]; Items?: Record<string, unknown>[] }>(
    '/sales/customer-chat/threads',
  );
  const rows = data.items ?? data.Items ?? [];
  return rows.map(normalizeThread);
}

export async function fetchCustomerChatMessages(customerId: string, beforeId?: string, limit = 50) {
  const { data } = await http.get<Record<string, unknown>>(
    `/sales/customer-chat/threads/${customerId}/messages`,
    { params: { beforeId, limit } },
  );
  const items = ((data.items ?? data.Items ?? []) as Record<string, unknown>[]).map(normalizeMessage);
  return {
    items,
    hasMore: Boolean(data.hasMore ?? data.HasMore),
  };
}

export async function sendStaffChatMessage(customerId: string, body: string) {
  const { data } = await http.post<Record<string, unknown>>(
    `/sales/customer-chat/threads/${customerId}/messages`,
    { body },
  );
  return normalizeMessage(data);
}

export async function markStaffChatRead(customerId: string) {
  await http.post(`/sales/customer-chat/threads/${customerId}/read`);
}
