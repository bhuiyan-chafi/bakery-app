import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, ShoppingCart, ClipboardList, Tag, Percent, ChevronsUpDown, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/config/constants";
import { usePermissions } from "@/hooks/usePermissions";

interface Product {
  uuid: string;
  name: string;
  price: number;
  current_stock: number;
  stock_threshold: number;
}

interface Salesman {
  uuid: string;
  username: string;
}

interface OrderLine {
  id: number;
  product_uuid: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  current_stock: number;
}

type OrderType = "shop" | "pickup" | "delivery";
type DiscountMode = "amount" | "percent";

const ORDER_TYPE_STATUS: Record<OrderType, string> = {
  shop: "complete",
  pickup: "pending",
  delivery: "pending",
};

const STATUS_STYLES: Record<string, string> = {
  complete: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
};

let lineIdCounter = 1;

export default function OrderPage() {
  const { hasPermission, hasAnyPermission, isLoading: isLoadingPermissions } = usePermissions();
  const canView = hasAnyPermission("order:view", "order:manage");
  const canManage = hasPermission("order:manage");

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const username = currentUser?.username ?? null;

  const [products, setProducts] = useState<Product[]>([]);
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);

  // Customer / order meta
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("shop");
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");

  // POS lines
  const [lines, setLines] = useState<OrderLine[]>([
    { id: lineIdCounter++, product_uuid: "", product_name: "", quantity: 1, unit_price: 0, current_stock: 0 },
  ]);

  // Discount
  const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
  const [discountValue, setDiscountValue] = useState("");

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Open state for per-line product combobox (tracks line.id)
  const [openComboLine, setOpenComboLine] = useState<number | null>(null);

  const derivedStatus = ORDER_TYPE_STATUS[orderType];

  const fetchProducts = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/products/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Could not load products");
    }
  }, []);

  const fetchSalesmen = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/orders/salesmen`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load salesmen");
      const data = await res.json();
      setSalesmen(Array.isArray(data) ? data : []);
    } catch {
      // non-critical, silently fail
    }
  }, []);

  useEffect(() => {
    if (canView) {
      fetchProducts();
      fetchSalesmen();
    }
  }, [canView, fetchProducts, fetchSalesmen]);

  // ── Line helpers ────────────────────────────────────────────────
  const addLine = () => {
    setLines(prev => [
      ...prev,
      { id: lineIdCounter++, product_uuid: "", product_name: "", quantity: 1, unit_price: 0, current_stock: 0 },
    ]);
  };

  const removeLine = (id: number) => {
    if (lines.length === 1) return;
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const updateLine = (id: number, patch: Partial<OrderLine>) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  };

  const handleProductSelect = (lineId: number, productUuid: string) => {
    const p = products.find(p => p.uuid === productUuid);
    if (!p) return;

    setLines(prev => {
      const existingLine = prev.find(l => l.id !== lineId && l.product_uuid === productUuid);

      if (existingLine) {
        const replacedLine = prev.find(l => l.id === lineId)!;
        const addedQty = replacedLine.quantity;
        const newQty = Math.min(existingLine.quantity + addedQty, p.current_stock || Infinity);

        if (addedQty + existingLine.quantity > p.current_stock) {
          toast.warning(`Only ${p.current_stock} units of "${p.name}" in stock. Quantity capped.`);
        }

        const updated = prev
          .map(l => l.id === existingLine.id ? { ...l, quantity: newQty } : l)
          .filter(l => l.id !== lineId);

        return updated.length > 0 ? updated : prev.map(l =>
          l.id === lineId ? { ...l, product_uuid: "", product_name: "", unit_price: 0, current_stock: 0 } : l
        );
      }

      return prev.map(l =>
        l.id === lineId
          ? {
              ...l,
              product_uuid: p.uuid,
              product_name: p.name,
              unit_price: p.current_stock === 0 ? 0 : p.price,
              quantity: p.current_stock === 0 ? 0 : 1,
              current_stock: p.current_stock,
            }
          : l
      );
    });

    if (p.current_stock === 0) {
      toast.error(`"${p.name}" is out of stock and cannot be ordered.`);
    }
  };

  // ── Calculations ─────────────────────────────────────────────────
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);

  const discountAmt = (() => {
    const val = parseFloat(discountValue) || 0;
    if (discountMode === "percent") return Math.min(subtotal * (val / 100), subtotal);
    return Math.min(val, subtotal);
  })();

  const total = Math.max(subtotal - discountAmt, 0);

  // ── Reset ────────────────────────────────────────────────────────
  const resetForm = () => {
    setCustomerName("");
    setPhone("");
    setAddress("");
    setOrderType("shop");
    setAssignedTo("");
    setNotes("");
    setDiscountValue("");
    setDiscountMode("amount");
    lineIdCounter = 1;
    setLines([{ id: lineIdCounter++, product_uuid: "", product_name: "", quantity: 1, unit_price: 0, current_stock: 0 }]);
  };

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!customerName.trim()) { toast.error("Customer name is required"); return; }
    const validLines = lines.filter(l => l.product_uuid && l.quantity > 0);
    if (validLines.length === 0) { toast.error("Add at least one product"); return; }

    setIsSubmitting(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        order_type: orderType,
        status: derivedStatus,
        notes: notes.trim() || null,
        sold_by: username,
        assigned_to: orderType === "delivery" ? (assignedTo || null) : null,
        discount_type: discountMode,
        discount_value: parseFloat(discountValue) || 0,
        subtotal,
        discount_amount: discountAmt,
        total,
        items: validLines.map(l => ({
          product_uuid: l.product_uuid,
          quantity: l.quantity,
          unit_price: l.unit_price,
          line_total: l.quantity * l.unit_price,
        })),
      };

      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/orders/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place order");
      toast.success(`Order placed — #${data.order_number ?? data.uuid?.slice(0, 8)}`);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoadingPermissions && !canView) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900 mb-1">Access Restricted</h2>
        <p className="text-sm text-zinc-500">You do not have permission to view or place orders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Row 1: Header ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <h1 className="text-3xl font-light tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-zinc-400" />
            Point of Sale
          </h1>
          <p className="text-muted-foreground mt-1">Create and manage customer orders.</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link to="/orders/manage" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Manage Orders
              </Link>
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Left: Customer + POS lines ───────────────────────────── */}
        <div className="xl:col-span-2 space-y-5">

          {/* ── Row 2: Customer details ──────────────────────────────── */}
          <div className="bg-white border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Customer Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cust-name">Name <span className="text-red-500">*</span></Label>
                <Input id="cust-name" placeholder="e.g. Sarah Johnson" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-phone">Phone</Label>
                <Input id="cust-phone" placeholder="+xxx xxx xxx xxxx" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cust-address">Address</Label>
                <Input id="cust-address" placeholder="Delivery address (optional)" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Order Type</Label>
                <Select value={orderType} onValueChange={v => { setOrderType(v as OrderType); setAssignedTo(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shop">Shop (walk-in)</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <div className={cn("h-9 px-3 flex items-center rounded-md border text-sm font-medium w-fit", STATUS_STYLES[derivedStatus])}>
                  {derivedStatus.charAt(0).toUpperCase() + derivedStatus.slice(1)}
                  <span className="ml-2 text-xs opacity-60">(auto-set)</span>
                </div>
              </div>
              {/* Delivery person — only shown when order type is Delivery */}
              {orderType === "delivery" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-zinc-400" />
                    Assign Delivery Person
                  </Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder={salesmen.length === 0 ? "No salesmen available" : "Select a person…"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Unassigned —</SelectItem>
                      {salesmen.map(s => (
                        <SelectItem key={s.uuid} value={s.username}>{s.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {salesmen.length === 0 && (
                    <p className="text-xs text-amber-600">No active salesmen found. Add a user with the NORMAL role.</p>
                  )}
                </div>
              )}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="order-notes">Notes</Label>
                <Input id="order-notes" placeholder="Any special instructions..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── Row 3: POS items ─────────────────────────────────────── */}
          <div className="bg-white border rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Order Items</h2>

            {/* Header row */}
            <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wide px-1">
              <div className="col-span-4">Product</div>
              <div className="col-span-2 text-center">In Stock</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-center">
                  {/* Product searchable combobox */}
                  <div className="col-span-12 sm:col-span-4">
                    <Popover
                      open={openComboLine === line.id}
                      onOpenChange={open => setOpenComboLine(open ? line.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "h-9 w-full justify-between font-normal",
                            !line.product_uuid && "text-zinc-400 border-zinc-200"
                          )}
                        >
                          <span className="truncate">
                            {line.product_name || "Select product..."}
                          </span>
                          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50" align="start">
                        <Command>
                          <CommandInput placeholder="Search products..." />
                          <CommandList>
                            <CommandEmpty>No products found.</CommandEmpty>
                            <CommandGroup>
                              {products.map(p => (
                                <CommandItem
                                  key={p.uuid}
                                  value={p.name}
                                  onSelect={() => {
                                    handleProductSelect(line.id, p.uuid);
                                    setOpenComboLine(null);
                                  }}
                                >
                                  <span className="flex-1 truncate">{p.name}</span>
                                  <span className={cn(
                                    "text-xs tabular-nums ml-2 shrink-0 font-medium",
                                    p.current_stock === 0 || (p.stock_threshold > 0 && p.current_stock <= p.stock_threshold)
                                      ? "text-red-500"
                                      : "text-emerald-600"
                                  )}>
                                    {p.current_stock} in stock
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Current stock (readonly) */}
                  <div className="col-span-4 sm:col-span-2 flex justify-center">
                    {line.product_uuid ? (
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium tabular-nums",
                        line.current_stock > 0
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      )}>
                        {line.current_stock} units
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-300">—</span>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="col-span-4 sm:col-span-2">
                    <Input
                      type="number"
                      min={line.current_stock > 0 ? 1 : 0}
                      step={1}
                      max={line.current_stock > 0 ? line.current_stock : 0}
                      readOnly={line.product_uuid !== "" && line.current_stock === 0}
                      disabled={line.product_uuid !== "" && line.current_stock === 0}
                      className={cn(
                        "h-9 text-center",
                        line.product_uuid && line.current_stock === 0
                          ? "opacity-40 cursor-not-allowed bg-zinc-50"
                          : line.product_uuid && line.quantity > line.current_stock && line.current_stock > 0
                          ? "border-red-400 focus-visible:ring-red-400"
                          : ""
                      )}
                      value={line.quantity}
                      onChange={e => {
                        if (line.current_stock === 0) return;
                        const requested = Math.max(1, parseInt(e.target.value) || 1);
                        const maxQty = line.current_stock;
                        if (requested > maxQty) {
                          toast.warning(`Only ${line.current_stock} units available for "${line.product_name}"`);
                        }
                        updateLine(line.id, { quantity: Math.min(requested, maxQty) });
                      }}
                    />
                  </div>

                  {/* Unit price */}
                  <div className="col-span-4 sm:col-span-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">₦</span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        readOnly={line.product_uuid !== "" && line.current_stock === 0}
                        disabled={line.product_uuid !== "" && line.current_stock === 0}
                        className={cn(
                          "h-9 pl-5 text-right",
                          line.product_uuid && line.current_stock === 0
                            ? "opacity-40 cursor-not-allowed bg-zinc-50"
                            : ""
                        )}
                        value={line.unit_price}
                        onChange={e => updateLine(line.id, { unit_price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  {/* Line total */}
                  <div className="col-span-3 sm:col-span-1 text-right text-sm font-medium text-zinc-700 tabular-nums">
                    ₦{(line.quantity * line.unit_price).toFixed(2)}
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length === 1}
                      className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={addLine} variant="outline" size="sm" className="w-full border-dashed text-zinc-400 hover:text-zinc-700">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Item
            </Button>
          </div>
        </div>

        {/* ── Right: Summary ───────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-5 space-y-5 sticky top-6">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Order Summary</h2>

            {/* Discount */}
            <div className="space-y-2">
              <Label>Discount</Label>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setDiscountMode("amount")}
                  className={cn(
                    "flex-1 h-8 rounded-md border text-xs font-medium flex items-center justify-center gap-1 transition-colors",
                    discountMode === "amount" ? "bg-zinc-900 text-white border-zinc-900" : "text-zinc-500 hover:border-zinc-400"
                  )}
                >
                  <Tag className="w-3 h-3" /> Amount
                </button>
                <button
                  onClick={() => setDiscountMode("percent")}
                  className={cn(
                    "flex-1 h-8 rounded-md border text-xs font-medium flex items-center justify-center gap-1 transition-colors",
                    discountMode === "percent" ? "bg-zinc-900 text-white border-zinc-900" : "text-zinc-500 hover:border-zinc-400"
                  )}
                >
                  <Percent className="w-3 h-3" /> Percent
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">
                  {discountMode === "amount" ? "₦" : "%"}
                </span>
                <Input
                  type="number"
                  min={0}
                  step={discountMode === "amount" ? 0.01 : 1}
                  max={discountMode === "percent" ? 100 : undefined}
                  placeholder="0"
                  className="pl-6"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                />
              </div>
            </div>

            {/* Totals breakdown */}
            <div className="space-y-2 text-sm border-t pt-4">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span className="tabular-nums">₦{subtotal.toFixed(2)}</span>
              </div>
              {discountAmt > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount {discountMode === "percent" && `(${discountValue}%)`}</span>
                  <span className="tabular-nums">−₦{discountAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-1">
                <span>Total</span>
                <span className="tabular-nums text-zinc-900">₦{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Item count */}
            <p className="text-xs text-zinc-400 text-center">
              {lines.filter(l => l.product_uuid).length} item(s) · {orderType} order
            </p>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-zinc-900 text-white hover:bg-zinc-700 h-11 text-base font-medium"
            >
              {isSubmitting ? "Placing Order…" : `Place Order · ₦${total.toFixed(2)}`}
            </Button>

            <Button onClick={resetForm} variant="ghost" size="sm" className="w-full text-zinc-400">
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
