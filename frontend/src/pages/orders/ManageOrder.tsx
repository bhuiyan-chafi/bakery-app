import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2, Pencil, Eye, X, Printer } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/config/constants";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

interface Order {
  uuid: string;
  order_number: string;
  customer_name: string;
  phone: string | null;
  address: string | null;
  order_type: string;
  status: string;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  subtotal: number;
  total: number;
  notes: string | null;
  created_at: string;
}

interface OrderItem {
  uuid: string;
  product_uuid: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface OrderDetail extends Order {
  items: OrderItem[];
}

const STATUS_STYLE: Record<string, string> = {
  complete: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const TYPE_ICONS: Record<string, string> = {
  shop: "🏪",
  pickup: "📦",
  delivery: "🚚",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ManageOrder() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Edit modal
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: "", phone: "", address: "", status: "", notes: ""
  });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/?limit=50`);
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      setOrders(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const openDetail = async (uuid: string) => {
    setIsDetailLoading(true);
    setIsDetailOpen(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${uuid}`);
      if (!res.ok) throw new Error("Failed to load order details");
      const data: OrderDetail = await res.json();
      setSelectedOrder(data);
    } catch (err: any) {
      toast.error(err.message);
      setIsDetailOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedOrder(null);
  };

  const handleDelete = async (uuid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this order? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${uuid}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete order");
      }
      toast.success("Order deleted");
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openEdit = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingOrder(order);
    setEditForm({
      customer_name: order.customer_name,
      phone: order.phone || "",
      address: order.address || "",
      status: order.status,
      notes: order.notes || "",
    });
  };

  const closeEdit = () => {
    setEditingOrder(null);
  };

  const handleEditSubmit = async () => {
    if (!editingOrder) return;
    if (!editForm.customer_name.trim()) { toast.error("Customer name is required"); return; }
    
    setIsEditSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${editingOrder.uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: editForm.customer_name,
          phone: editForm.phone || null,
          address: editForm.address || null,
          status: editForm.status,
          notes: editForm.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update order");
      }
      toast.success("Order updated");
      closeEdit();
      fetchOrders();
      if (selectedOrder?.uuid === editingOrder.uuid) {
        closeDetail(); // close detail view to avoid stale data
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/orders" className="text-muted-foreground hover:text-black transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-3xl font-light tracking-tight">Manage Orders</h1>
          </div>
          <p className="text-muted-foreground">View and manage the latest 50 customer orders. Click a row to see items.</p>
        </div>
        <div className="text-sm text-zinc-400">{orders.length} order(s)</div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50">
              <TableHead className="font-medium">#</TableHead>
              <TableHead className="font-medium">Customer</TableHead>
              <TableHead className="font-medium">Type</TableHead>
              <TableHead className="font-medium">Status</TableHead>
              <TableHead className="font-medium text-right">Total</TableHead>
              <TableHead className="font-medium">Date</TableHead>
              <TableHead className="text-right font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground italic">
                  Loading orders…
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground italic">
                  No orders yet. Place your first order from the POS.
                </TableCell>
              </TableRow>
            ) : (
              orders.map(order => {
                const isComplete = order.status === "complete";
                return (
                  <TableRow
                    key={order.uuid}
                    className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                    onClick={() => openDetail(order.uuid)}
                  >
                    <TableCell className="font-mono text-zinc-500 text-xs">
                      {order.order_number || order.uuid.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{order.customer_name}</div>
                      {order.phone && <div className="text-xs text-zinc-400">{order.phone}</div>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {TYPE_ICONS[order.order_type] || ""} {cap(order.order_type)}
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", STATUS_STYLE[order.status] ?? "bg-zinc-100 text-zinc-600")}>
                        {cap(order.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      ${order.total.toFixed(2)}
                      {order.discount_amount > 0 && (
                        <span className="ml-1 text-xs text-emerald-600">−${order.discount_amount.toFixed(2)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">{formatDate(order.created_at)}</TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-zinc-700"
                          title="View details"
                          onClick={(e) => { e.stopPropagation(); openDetail(order.uuid); }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {!isComplete && (
                          <>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-zinc-400 hover:text-blue-600"
                              title="Edit order"
                              onClick={(e) => openEdit(order, e)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-zinc-400 hover:text-red-600"
                              title="Delete order"
                              onClick={(e) => handleDelete(order.uuid, e)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {isComplete && (
                          <span className="text-xs text-zinc-300 flex items-center pr-1">Locked</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Order Detail Modal ───────────────────────────────────────── */}
      {isDetailOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeDetail}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="flex items-start justify-between p-5 border-b">
              <div>
                <p className="text-xs text-zinc-400 font-mono mb-0.5">
                  {selectedOrder?.order_number ?? "…"}
                </p>
                <h2 className="text-lg font-semibold">{selectedOrder?.customer_name ?? "Loading…"}</h2>
                {selectedOrder && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm text-zinc-500">
                      {TYPE_ICONS[selectedOrder.order_type]} {cap(selectedOrder.order_type)}
                    </span>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", STATUS_STYLE[selectedOrder.status] ?? "bg-zinc-100 text-zinc-600")}>
                      {cap(selectedOrder.status)}
                    </span>
                    <span className="text-xs text-zinc-400">{formatDate(selectedOrder.created_at)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors"
                  title="Print POS Receipt"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={closeDetail}
                  className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {isDetailLoading ? (
                <p className="text-center text-zinc-400 italic py-8">Loading…</p>
              ) : selectedOrder ? (
                <>
                  {/* Customer extras */}
                  {(selectedOrder.phone || selectedOrder.address || selectedOrder.notes) && (
                    <div className="text-sm space-y-1 text-zinc-500">
                      {selectedOrder.phone && <p>📞 {selectedOrder.phone}</p>}
                      {selectedOrder.address && <p>📍 {selectedOrder.address}</p>}
                      {selectedOrder.notes && <p>📝 {selectedOrder.notes}</p>}
                    </div>
                  )}

                  {/* Items table */}
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Items</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-50 text-zinc-500 text-xs">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Product</th>
                            <th className="text-center px-3 py-2 font-medium">Qty</th>
                            <th className="text-right px-3 py-2 font-medium">Unit Price</th>
                            <th className="text-right px-3 py-2 font-medium">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {selectedOrder.items.map(item => (
                            <tr key={item.uuid}>
                              <td className="px-3 py-2 font-medium">{item.product_name}</td>
                              <td className="px-3 py-2 text-center text-zinc-500">{item.quantity}</td>
                              <td className="px-3 py-2 text-right text-zinc-500 tabular-nums">${item.unit_price.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right font-medium tabular-nums">${item.line_total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financials */}
                  <div className="border rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-zinc-500">
                      <span>Subtotal</span>
                      <span className="tabular-nums">${selectedOrder.subtotal.toFixed(2)}</span>
                    </div>
                    {selectedOrder.discount_amount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>
                          Discount
                          {selectedOrder.discount_type === "percent"
                            ? ` (${selectedOrder.discount_value}%)`
                            : ""}
                        </span>
                        <span className="tabular-nums">−${selectedOrder.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-base border-t pt-2 mt-1">
                      <span>Total</span>
                      <span className="tabular-nums">${selectedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Hidden Printable Receipt for POS */}
                  <style type="text/css" media="print">
                    {`
                      @page { size: 80mm auto; margin: 0; }
                      body * { visibility: hidden; }
                      #printable-receipt, #printable-receipt * { visibility: visible; }
                      #printable-receipt { 
                        display: block !important;
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 80mm; 
                        padding: 5mm; 
                        font-family: monospace; 
                        color: black !important;
                      }
                    `}
                  </style>
                  <div id="printable-receipt" className="hidden print:block">
                    <div className="text-center mb-4">
                      <h2 className="text-xl font-bold m-0 p-0">{APP_NAME}</h2>
                      <p className="text-xs m-0 p-0">Customer Receipt</p>
                    </div>
                    
                    <div className="mb-4 text-xs space-y-1">
                      <p className="m-0 p-0">Order #: {selectedOrder.order_number}</p>
                      <p className="m-0 p-0">Date: {formatDate(selectedOrder.created_at)}</p>
                      <p className="m-0 p-0">Customer: {selectedOrder.customer_name}</p>
                      <p className="m-0 p-0">Type: {cap(selectedOrder.order_type)}</p>
                    </div>

                    <div className="border-t border-b border-black py-2 mb-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            <th className="text-left font-normal pb-1 border-b border-black">Item</th>
                            <th className="text-right font-normal pb-1 border-b border-black">Qty</th>
                            <th className="text-right font-normal pb-1 border-b border-black">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items.map(item => (
                            <tr key={item.uuid}>
                              <td className="py-1 break-words align-top pr-1">{item.product_name}</td>
                              <td className="text-right py-1 align-top">{item.quantity}</td>
                              <td className="text-right py-1 align-top">${item.line_total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="text-xs space-y-1 mb-4">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>${selectedOrder.subtotal.toFixed(2)}</span>
                      </div>
                      {selectedOrder.discount_amount > 0 && (
                        <div className="flex justify-between">
                          <span>Discount:</span>
                          <span>-${selectedOrder.discount_amount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-sm mt-1 border-t border-black pt-1">
                        <span>Total:</span>
                        <span>${selectedOrder.total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-center text-xs mt-6 mb-8">
                      <p className="m-0 p-0">Thank you for your business!</p>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* ── Edit Modal ─────────────────────────────────────────────── */}
      {editingOrder && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeEdit} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h2 className="text-lg font-semibold">Edit Order</h2>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{editingOrder.order_number}</p>
              </div>
              <button onClick={closeEdit} className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Customer Name</Label>
                <Input value={editForm.customer_name} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-6">
              <Button variant="ghost" onClick={closeEdit} disabled={isEditSubmitting}>Cancel</Button>
              <Button onClick={handleEditSubmit} disabled={isEditSubmitting}>
                {isEditSubmitting ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
