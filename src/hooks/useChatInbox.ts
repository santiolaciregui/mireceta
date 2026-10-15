import { useCallback, useEffect, useRef, useState } from 'react';
import type { MedicalOrder, SystemUser } from '../types';
import { CHAT_READ_EVENT, CHAT_READ_KEY, countUnreadConversations, readChatTimestamps } from '../utils/chatInbox';

export function useChatInbox(currentUser: SystemUser | null, orders: MedicalOrder[]) {
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const refreshConversations = useCallback(() => refreshRef.current(), []);
  const [isLoaded, setIsLoaded] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [readTimestamps, setReadTimestamps] = useState(readChatTimestamps);

  useEffect(() => {
    const update = () => setReadTimestamps(readChatTimestamps());
    const onStorage = (event: StorageEvent) => {
      if (event.key === CHAT_READ_KEY || event.key === null) update();
    };
    window.addEventListener(CHAT_READ_EVENT, update);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHAT_READ_EVENT, update);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    setConversations([]);
    setIsLoaded(false);
    if (!currentUser) return;
    const controller = new AbortController();
    let fetching = false;
    const refresh = async () => {
      if (fetching || document.hidden) return;
      fetching = true;
      try {
        const response = await fetch('/api/chat/conversations?summary=1', {
          headers: { Authorization: `Bearer ${localStorage.getItem('mi-receta-jwt') || ''}` },
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          if (!controller.signal.aborted && Array.isArray(data)) {
            setConversations(data);
            setIsLoaded(true);
          }
        }
      } catch {
        // Preserve the last successful inbox and retry at the next refresh.
      } finally {
        fetching = false;
      }
    };
    refreshRef.current = refresh;
    void refresh();
    const interval = window.setInterval(refresh, 5000);
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      refreshRef.current = async () => {};
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [currentUser?.id, currentUser?.tenantId, currentUser?.role]);

  return { conversations, isLoaded, refreshConversations, chatCount: countUnreadConversations(conversations, orders, readTimestamps, currentUser?.role === 'paciente') };
}
