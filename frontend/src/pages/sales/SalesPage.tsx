import { useState, useEffect, useCallback } from "react";
import { ShoppingBag, Plus, Trash2, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/config/constants";

interface Product {
  uuid: string;
  name: string;
  price: number;
  current_stock: number;
}

interface OrderLine {
  id: number;
  product_uuid: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  current_stock: number;
}

let lineIdCounter = 1;

export default function SalesPage() {
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const username = user?.username ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<"pending" | "complete">("pending");
  const [lines, setLines] = useState<OrderLine[]>([
    { id: lineIdCounter++, product_uuid: "", product_name: "", quantity: 1, unit_price: 0, current_stock: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openComboLine, setOpenComboLine] = useState<number | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products/`);
      if (!res.ok) throw new Error("Failed to load products");
      setProducts(await res.json());
    } catch {
      toast.error("Could not load products");
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

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
    if (p.current_stock === 0) {
      toast.error(`"${p.name}" is out of stock.`);
    }
    setLines(prev => prev.map(l =>
      l.id === lineId
        ? { ...l, product_uuid: p.uuid, product_name: p.name, unit_price: p.price, quantity: p.current_stock === 0 ? 0 : 1, current_stock: p.current_stock }
        : l
    ));
  };

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);

  const resetForm = () => {
    setCustomerName("");
    setPhone("");
    setAddress("");
    setStatus("pending");
    lineIdCounter = 1;
    setLines([{ id: lineIdCounter++, product_uuid: "", product_name: "", quantity: 1, unit_price: 0, current_stock: 0 }]);
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) { toast.error("Customer name is required"); return; }
    if (!phone.trim()) { toast.error("Phone number is required"); return; }
    const validLines = lines.filter(l => l.product_uuid && l.quantity > 0);
    if (validLines.length === 0) { toast.error("Add at least one product"); return; }

    setIsSubmitting(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        phone: phone.trim(),
        address: address.trim() || null,
        order_type: "delivery",
        status,
        sold_by: username,
        discount_type: "amount",
        discount_value: 0,
        subtotal,
        discount_amount: 0,
        total: subtotal,
        items: validLines.map(l => ({
          product_uuid: l.product_uuid,
          quantity: l.quantity,
          unit_price: l.unit_price,
          line_total: l.quantity * l.unit_price,
        })),
      };

      const res = await fetch(`${API_BASE_URL}/orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light tracking-tight flex items-center gap-2">
          <ShoppingBag className="w-7 h-7 text-zinc-400" />
          New Sale
        </h1>
        <p className="text-muted-foreground mt-1">Create a delivery order for a customer.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: form */}
        <div className="xl:col-span-2 space-y-5">

          {/* Seller + Customer */}
          <div className="bg-white border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Order Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sold By — readonly */}
              <div className="space-y-1.5">
                <Label htmlFor="sold-by">Sold By</Label>
                <Input id="sold-by" value={username} readOnly className="bg-zinc-50 cursor-not-allowed text-zinc-500" />
              </div>

              {/* Order Type — fixed */}
              <div className="space-y-1.5">
                <Label>Order Type</Label>
                <div className="h-9 px-3 flex items-center rounded-md border text-sm bg-zinc-50 text-zinc-500">
                  🚚 Delivery <span className="ml-2 text-xs opacity-60">(fixed)</span>
                </div>
              </div>

              {/* Customer name */}
              <div className="space-y-1.5">
                <Label htmlFor="cust-name">Customer Name <span className="text-red-500">*</span></Label>
                <Input id="cust-name" placeholder="e.g. Sarah Johnson" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="cust-phone">Phone <span className="text-red-500">*</span></Label>
                <Input id="cust-phone" placeholder="+xxx xxx xxx xxxx" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>

              {/* Address */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cust-address">Address</Label>
                <Input id="cust-address" placeholder="Delivery address" value={address} onChange={e => setAddress(e.target.value)} />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as "pending" | "complete")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white border rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Order Items</h2>

            <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wide px-1">
              <div className="col-span-5">Product</div>
              <div className="col-span-2 text-center">In Stock</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-center">
                  {/* Product combobox */}
                  <div className="col-span-12 sm:col-span-5">
                    <Popover open={openComboLine === line.id} onOpenChange={open => setOpenComboLine(open ? line.id : null)}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("h-9 w-full justify-between font-normal", !line.product_uuid && "text-zinc-400 border-zinc-200")}
                        >
                          <span className="truncate">{line.product_name || "Select product..."}</span>
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
                                  onSelect={() => { handleProductSelect(line.id, p.uuid); setOpenComboLine(null); }}
                                >
                                  <span className="flex-1 truncate">{p.name}</span>
                                  <span className={cn("text-xs tabular-nums ml-2 shrink-0", p.current_stock === 0 ? "text-red-400" : "text-zinc-400")}>
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

                  {/* Stock badge */}
                  <div className="col-span-4 sm:col-span-2 flex justify-center">
                    {line.product_uuid ? (
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium tabular-nums", line.current_stock > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                        {line.current_stock} units
                      </span>
                    ) : <span className="text-xs text-zinc-300">—</span>}
                  </div>

                  {/* Qty */}
                  <div className="col-span-4 sm:col-span-2">
                    <Input
                      type="number"
                      min={line.current_stock > 0 ? 1 : 0}
                      max={line.current_stock > 0 ? line.current_stock : 0}
                      className="h-9 text-center"
                      value={line.quantity}
                      onChange={e => {
                        if (line.current_stock === 0) return;
                        const req = Math.max(1, parseInt(e.target.value) || 1);
                        updateLine(line.id, { quantity: Math.min(req, line.current_stock) });
                      }}
                    />
                  </div>

                  {/* Unit price */}
                  <div className="col-span-3 sm:col-span-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>
                      <Input type="number" min={0} step={0.01} className="h-9 pl-5 text-right" value={line.unit_price}
                        onChange={e => updateLine(line.id, { unit_price: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeLine(line.id)} disabled={lines.length === 1}
                      className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
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

        {/* Right: Summary */}
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-5 space-y-5 sticky top-6">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Order Summary</h2>

            <div className="space-y-2 text-sm border-t pt-4">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span className="tabular-nums">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-2 mt-2">
                <span>Total</span>
                <span className="tabular-nums text-zinc-900">${subtotal.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 text-center">
              {lines.filter(l => l.product_uuid).length} item(s) · Delivery
            </p>

            <Button onClick={handleSubmit} disabled={isSubmitting}
              className="w-full bg-zinc-900 text-white hover:bg-zinc-700 h-11 text-base font-medium">
              {isSubmitting ? "Placing Order…" : `Place Order · $${subtotal.toFixed(2)}`}
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
