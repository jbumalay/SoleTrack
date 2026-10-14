import { useState, useEffect, useCallback } from "react";
import { Bell, Package, Truck, CheckCircle2, Clock, XCircle, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { apiService } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { normalizeList } from "@/utils/normalizeList";
import {
  listNotifications,
  markAllRead,
  pushNotification,
  onNotificationsChanged,
  AppNotification,
} from "@/utils/notifications";

const POLL_INTERVAL_MS = 60_000;

const STATUS_LABELS: Record<string, string> = {
  pending: "awaiting confirmation",
  confirmed: "confirmed",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
  requested: "return requested",
  approved: "return approved",
};

function statusIcon(type: string) {
  if (type.includes("delivered")) return <CheckCircle2 size={16} className="text-green-500" />;
  if (type.includes("shipped")) return <Truck size={16} className="text-indigo-500" />;
  if (type.includes("cancelled")) return <XCircle size={16} className="text-red-500" />;
  if (type.includes("new_order")) return <Package size={16} className="text-primary" />;
  if (type.includes("return")) return <RotateCcw size={16} className="text-orange-500" />;
  return <Clock size={16} className="text-amber-500" />;
}

/**
 * Polls the signed-in user's orders every 60s and records status changes as
 * local notifications (no backend notifications feed yet).
 */
function useOrderPolling(userId: number | undefined, role: string | undefined) {
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(() => {
    if (userId) setItems(listNotifications(userId));
  }, [userId]);

  useEffect(() => {
    load();
    return onNotificationsChanged(load);
  }, [load]);

  useEffect(() => {
    if (!userId || !role) return;
    const watchKey = `soletrack_order_watch_${userId}`;
    let cancelled = false;

    const readWatch = (): Record<string, string> => {
      try {
        return JSON.parse(localStorage.getItem(watchKey) || "{}");
      } catch {
        return {};
      }
    };

    const poll = async () => {
      if (cancelled) return;
      try {
        const response = role === "seller"
          ? await apiService.getSellerOrders({ page: 1, limit: 100 })
          : await apiService.getMyOrders();
        if (response?.status !== "success") return;
        const orders = normalizeList<any>(response.data) ?? [];
        const current: Record<string, string> = {};
        orders.forEach((o: any) => { current[String(o.order_id)] = String(o.order_status); });

        const previous = readWatch();
        const isFirstRun = Object.keys(previous).length === 0;

        if (!isFirstRun) {
          // New orders (sellers mainly, but harmless for customers re-logging in)
          for (const [orderId, status] of Object.entries(current)) {
            if (!(orderId in previous)) {
              pushNotification({
                user_id: userId,
                type: "new_order",
                title: "New order received",
                body: `Order #${orderId} is ${STATUS_LABELS[status] ?? status}.`,
                order_id: Number(orderId),
              });
            }
          }
          // Status transitions
          for (const [orderId, status] of Object.entries(current)) {
            const before = previous[orderId];
            if (before && before !== status) {
              const isReturn = status === "requested" || status === "approved" || before === "requested";
              pushNotification({
                user_id: userId,
                type: isReturn ? "return_update" : "order_update",
                title: isReturn ? "Return update" : "Order update",
                body: `Order #${orderId} moved from ${before} to ${status}.`,
                order_id: Number(orderId),
              });
            }
          }
        }

        if (!cancelled) localStorage.setItem(watchKey, JSON.stringify(current));
      } catch {
        // Polling is best-effort; ignore transient failures.
      }
    };

    poll();
    const timer = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [userId, role]);

  return { items, reload: load };
}

export function NotificationBell({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const isSeller = user?.role === "seller";
  const { items, reload } = useOrderPolling(user?.user_id, user?.role);
  const [open, setOpen] = useState(false);
  const unread = items.filter((n) => !n.read).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && user && unread > 0) {
      markAllRead(user.user_id);
      reload();
    }
  };

  if (!user) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={toggle}
        title="Notifications"
        className="relative p-2.5 hover:bg-muted rounded-xl transition-all group"
      >
        <Bell className="w-5 h-5 group-active:scale-95 transition-transform" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-white shadow-lg shadow-red-500/20">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              aria-hidden
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 custom-scrollbar"
            >
              <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Notifications</p>
                {unread > 0 && (
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">{unread} unread</span>
                )}
              </div>
              {items.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-gray-300">
                  <Bell size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest">No updates yet</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {items.map((n) => (
                    <li key={n.id} className={`px-6 py-5 flex gap-4 ${n.read ? "" : "bg-primary/5"}`}>
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        {statusIcon(n.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black italic text-gray-900">{n.title}</p>
                        <p className="text-[11px] font-medium text-gray-500 mt-1 leading-relaxed">{n.body}</p>
                        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mt-1">
                          {new Date(n.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
