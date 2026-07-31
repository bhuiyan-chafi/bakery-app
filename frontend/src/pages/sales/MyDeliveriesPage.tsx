import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Truck, Eye, CheckCircle, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/config/constants";

interface OrderItem {
  uuid: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface DeliveryOrder {
  uuid: string;
  order_number: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
  status: string;
  notes: string | null;
  total: number;
  created_at: string;
  items: OrderItem[];
}

const STATUS_STYLE: Record<string, string> = {
  complete: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending:  "bg-amber-100  text-amber-700  border-amber-200",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function MyDeliveriesPage() {
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const username = user?.username ?? "";

  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View modal
  const [viewOrder, setViewOrder] = useState<DeliveryOrder | null>(null);

  // Mark as delivered
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!username) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/my-deliveries?username=${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error("Failed to load deliveries");
      setOrders(await res.json());
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleMarkDelivered = async (order: DeliveryOrder) => {
    if (order.status === "complete") return;
    if (!confirm(`Mark order ${order.order_number} as delivered?`)) return;
    setMarkingId(order.uuid);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${order.uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "complete" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order");
      toast.success(`Order ${order.order_number} marked as delivered!`);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setMarkingId(null);
    }
  };

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const doneCount = orders.filter(o => o.status === "complete").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight flex items-center gap-2">
            <Truck className="w-7 h-7 text-zinc-400" />
            My Deliveries
          </h1>
          <p className="text-muted-foreground mt-1">
            Orders assigned to you for delivery.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-semibold text-amber-700">{pendingCount}</div>
            <div className="text-xs text-amber-600">Pending</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-semibold text-emerald-700">{doneCount}</div>
            <div className="text-xs text-emerald-600">Delivered</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground italic">Loading your deliveries…</div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-muted-foreground italic">No deliveries assigned to you yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b text-xs font-medium text-zinc-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">#</th>
                <th className="text-left px-5 py-3">Customer</th>
                <th className="text-left px-5 py-3">Phone</th>
                <th className="text-left px-5 py-3">Address</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.map(order => {
                const isComplete = order.status === "complete";
                return (
                  <tr key={order.uuid} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-zinc-500">{order.order_number}</td>
                    <td className="px-5 py-3 font-medium">{order.customer_name}</td>
                    <td className="px-5 py-3 text-zinc-500">{order.phone ?? <span className="text-zinc-300">—</span>}</td>
                    <td className="px-5 py-3 text-zinc-500 max-w-[180px] truncate">
                      {order.address ?? <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", STATUS_STYLE[order.status] ?? "bg-zinc-100 text-zinc-600")}>
                        {cap(order.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-500 whitespace-nowrap">{formatDate(order.created_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        {/* View details */}
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-zinc-700"
                          title="View order details"
                          onClick={() => setViewOrder(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {/* Mark as delivered */}
                        {!isComplete && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-emerald-600"
                            title="Mark as delivered"
                            disabled={markingId === order.uuid}
                            onClick={() => handleMarkDelivered(order)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}

                        {isComplete && (
                          <span className="text-xs text-zinc-300 flex items-center px-2">Delivered</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* View Modal */}
      {viewOrder && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewOrder(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="flex items-start justify-between p-5 border-b">
              <div>
                <p className="text-xs text-zinc-400 font-mono mb-0.5">{viewOrder.order_number}</p>
                <h2 className="text-lg font-semibold">{viewOrder.customer_name}</h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500 flex-wrap">
                  {viewOrder.phone && <span>📞 {viewOrder.phone}</span>}
                  {viewOrder.address && <span>📍 {viewOrder.address}</span>}
                </div>
              </div>
              <button
                onClick={() => setViewOrder(null)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Items */}
              <div>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Order Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 text-zinc-500 text-xs border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Product</th>
                        <th className="text-center px-3 py-2 font-medium">Qty</th>
                        <th className="text-right px-3 py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {viewOrder.items.map(item => (
                        <tr key={item.uuid}>
                          <td className="px-3 py-2 font-medium">{item.product_name}</td>
                          <td className="px-3 py-2 text-center text-zinc-500">{item.quantity}</td>
                          <td className="px-3 py-2 text-right tabular-nums">${item.line_total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {viewOrder.notes && (
                <div>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Special Notes</h3>
                  <p className="text-sm text-zinc-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    📝 {viewOrder.notes}
                  </p>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between font-semibold text-base border-t pt-3 mt-1">
                <span>Total</span>
                <span className="tabular-nums">${viewOrder.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Modal footer */}
            <div className="p-4 border-t flex gap-2">
              {viewOrder.status !== "complete" && (
                <Button
                  onClick={() => { handleMarkDelivered(viewOrder); setViewOrder(null); }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark as Delivered
                </Button>
              )}
              <Button variant="outline" onClick={() => setViewOrder(null)} className={viewOrder.status === "complete" ? "w-full" : ""}>
                Close
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
