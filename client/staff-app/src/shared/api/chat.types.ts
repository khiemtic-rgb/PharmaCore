export interface ChatThread {
  threadId: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  customerPhone: string | null;
  staffUnreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
}

export interface ChatMessage {
  id: string;
  senderType: number;
  senderName: string | null;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export const CHAT_SENDER_CUSTOMER = 1;
