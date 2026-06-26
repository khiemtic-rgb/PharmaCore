import { useEffect, useState } from 'react';
import {
  CUSTOMER_DRAFT_ORDER_STATUS,
  fetchCustomerDraftOrders,
} from '@/shared/api/customer-draft-orders.api';

const POLL_MS = 30_000;

/** Số đơn tạm đã gửi hoặc khách đã xác nhận — cần xử lý tại quầy. */
export function usePendingCustomerDraftCount(enabled = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const items = await fetchCustomerDraftOrders(undefined, [
          CUSTOMER_DRAFT_ORDER_STATUS.Sent,
          CUSTOMER_DRAFT_ORDER_STATUS.Confirmed,
        ]);
        if (!cancelled) setCount(items.length);
      } catch {
        // im lặng
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  return count;
}
