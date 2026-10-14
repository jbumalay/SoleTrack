export interface AppNotification {
  id: string;
  user_id: number;
  type: string;
  title: string;
  body: string;
  order_id?: number;
  read: boolean;
  created_at: string;
}

const NOTIFICATIONS_KEY = "soletrack_notifications";
const CHANGED_EVENT = "soletrack:notifications";

/** Notifications are localStorage-only until the backend exposes a notifications feed. */
function readAll(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY) || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: AppNotification[]): void {
  // Cap history so the demo store cannot grow unbounded.
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items.slice(-100)));
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function listNotifications(userId: number): AppNotification[] {
  return readAll()
    .filter((n) => n.user_id === userId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function unreadCount(userId: number): number {
  return readAll().filter((n) => n.user_id === userId && !n.read).length;
}

export function pushNotification(notification: Omit<AppNotification, "id" | "read" | "created_at">): void {
  writeAll([
    ...readAll(),
    {
      ...notification,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      read: false,
      created_at: new Date().toISOString(),
    },
  ]);
}

export function markAllRead(userId: number): void {
  writeAll(readAll().map((n) => (n.user_id === userId ? { ...n, read: true } : n)));
}

export function clearNotifications(userId: number): void {
  writeAll(readAll().filter((n) => n.user_id !== userId));
}

/** Subscribe to store changes; returns an unsubscribe function. */
export function onNotificationsChanged(handler: () => void): () => void {
  window.addEventListener(CHANGED_EVENT, handler);
  return () => window.removeEventListener(CHANGED_EVENT, handler);
}
