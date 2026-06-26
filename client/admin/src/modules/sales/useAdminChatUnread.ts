import { useEffect, useRef, useState } from 'react';

import { useLocation } from 'react-router-dom';

import { fetchChatThreads } from '@/shared/api/chat.api';

import { useAuthStore } from '@/shared/auth/auth.store';

import { buildAdminChatEventsUrl, subscribeChatSse } from '@/shared/utils/chat-sse';

import { showDesktopNotification } from '@/shared/utils/desktop-notification';



const FALLBACK_POLL_MS = 30_000;



export function useAdminChatUnread(enabled = true) {

  const location = useLocation();

  const accessToken = useAuthStore((s) => s.accessToken);

  const [totalUnread, setTotalUnread] = useState(0);

  const prevUnreadRef = useRef(0);

  const initializedRef = useRef(false);



  useEffect(() => {

    if (!enabled) return;



    let cancelled = false;



    const poll = async () => {

      try {

        const threads = await fetchChatThreads();

        if (cancelled) return;



        const total = threads.reduce((sum, thread) => sum + thread.staffUnreadCount, 0);

        const onChatPage = location.pathname.startsWith('/sales/chat');

        const shouldNotify =

          initializedRef.current &&

          total > prevUnreadRef.current &&

          total > 0 &&

          (!onChatPage || document.hidden);



        if (shouldNotify) {

          const latest = threads.find((thread) => thread.staffUnreadCount > 0);

          const preview = latest?.lastMessagePreview?.trim() || 'Có tin nhắn mới';

          showDesktopNotification(

            'Tin nhắn khách hàng mới',

            latest ? `${latest.customerName}: ${preview}` : `Bạn có ${total} tin chưa đọc`,

            latest ? `chat-${latest.customerId}` : 'chat-unread',

          );

        }



        initializedRef.current = true;

        prevUnreadRef.current = total;

        setTotalUnread(total);

      } catch {

        // im lặng — badge sẽ thử lại ở lần poll sau

      }

    };



    void poll();

    const timer = window.setInterval(() => void poll(), FALLBACK_POLL_MS);

    const unsubscribeSse = accessToken

      ? subscribeChatSse(buildAdminChatEventsUrl(accessToken), () => void poll())

      : () => undefined;



    return () => {

      cancelled = true;

      window.clearInterval(timer);

      unsubscribeSse();

    };

  }, [enabled, location.pathname, accessToken]);



  return totalUnread;

}

