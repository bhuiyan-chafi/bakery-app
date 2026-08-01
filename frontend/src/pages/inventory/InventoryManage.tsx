import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ChevronsUpDown, Check, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/config/constants";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";

interface Transaction {
  uuid: string;
  inventory_uuid: string;
  inventory_name: string;
  unit_measurement: string;
  quantity: number;
  transaction_type: string;
  cost: number;
  datetime: string;
  status: string;
  supplier: string | null;
}

interface InventoryItem {
  uuid: string;
  name: string;
  unit_measurement: string;
}

export default function InventoryManage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInventoryPopoverOpen, setIsInventoryPopoverOpen] = useState(false);

  // Form state
  const [editUuid, setEditUuid] = useState<string | null>(null);
  const [selectedInventoryUuid, setSelectedInventoryUuid] = useState("");
  const [selectedInventoryName, setSelectedInventoryName] = useState("Select an item");
  const [selectedUnitLabel, setSelectedUnitLabel] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [transactionType, setTransactionType] = useState("IN");
  const [cost, setCost] = useState("0");
  const [supplier, setSupplier] = useState("");

  useEffect(() => {
    fetchTransactions();
    fetchInventory();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/transactions`);
      if (!response.ok) throw new Error("Failed to fetch transactions");
      const data = await response.json();
      setTransactions(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/`);
      if (!response.ok) throw new Error("Failed to fetch inventory");
      const data = await response.json();
      setInventoryItems(data);
      setFilteredInventory(data);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleInventorySearch = (query: string) => {
    if (!query) { setFilteredInventory(inventoryItems); return; }
    setFilteredInventory(inventoryItems.filter((i) =>
      i.name.toLowerCase().includes(query.toLowerCase())
    ));
  };

  const resetForm = () => {
    setEditUuid(null);
    setSelectedInventoryUuid("");
    setSelectedInventoryName("Select an item");
    setSelectedUnitLabel("");
    setQuantity("1");
    setTransactionType("IN");
    setCost("0");
    setSupplier("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventoryUuid) { toast.error("Please select an inventory item"); return; }
    if (!quantity || parseFloat(quantity) <= 0) { toast.error("Quantity must be greater than zero"); return; }

    setIsSubmitting(true);
    try {
      const url = editUuid
        ? `${API_BASE_URL}/inventory/transactions/${editUuid}`
        : `${API_BASE_URL}/inventory/transactions`;
      const method = editUuid ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory_uuid: selectedInventoryUuid,
          quantity: parseFloat(quantity),
          transaction_type: transactionType,
          cost: parseFloat(cost) || 0,
          supplier: supplier || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Operation failed");
      }

      toast.success(editUuid ? "Transaction updated" : "Transaction recorded");
      setIsModalOpen(false);
      resetForm();
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (t: Transaction) => {
    setEditUuid(t.uuid);
    setSelectedInventoryUuid(t.inventory_uuid);
    setSelectedInventoryName(t.inventory_name);
    setSelectedUnitLabel(t.unit_measurement);
    setQuantity(String(t.quantity));
    setTransactionType(t.transaction_type);
    setCost(String(t.cost));
    setSupplier(t.supplier || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/transactions/${uuid}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete transaction");
      }
      toast.success("Transaction deleted");
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleStatusChange = async (uuid: string, newStatus: "APPROVED" | "REJECTED") => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/transactions/${uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update status");
      }
      toast.success(`Transaction ${newStatus}`);
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    APPROVED: "bg-emerald-100 text-emerald-700",
    REJECTED: "bg-red-100 text-red-700",
  };

  const typeColors: Record<string, string> = {
    IN: "bg-blue-100 text-blue-700",
    OUT: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        {/* Title row */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/inventory" className="text-muted-foreground hover:text-black transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-3xl font-light tracking-tight">Manage Inventory</h1>
          </div>
          <p className="text-muted-foreground mt-1">Record and track incoming and outgoing inventory transactions.</p>
        </div>

        {/* Action buttons row */}
        <div className="flex flex-wrap items-center gap-2">
        <Dialog
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-black text-white hover:bg-zinc-800">
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editUuid ? "Edit Transaction" : "New Transaction"}</DialogTitle>
              <DialogDescription>
                {editUuid ? "Update the transaction details." : "Record a new inventory movement."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-2">

              {/* Inventory Item */}
              <div className="space-y-2 flex flex-col">
                <Label>Inventory Item <span className="text-red-500">*</span></Label>
                <Popover open={isInventoryPopoverOpen} onOpenChange={setIsInventoryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                      disabled={isSubmitting}
                    >
                      {selectedInventoryName}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[430px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder="Search inventory..." onValueChange={handleInventorySearch} />
                      <CommandList>
                        <CommandEmpty>No items found.</CommandEmpty>
                        <CommandGroup>
                          {filteredInventory.map((item) => (
                            <CommandItem
                              key={item.uuid}
                              value={item.uuid}
                              onSelect={() => {
                                setSelectedInventoryUuid(item.uuid);
                                setSelectedInventoryName(item.name);
                                setSelectedUnitLabel(item.unit_measurement);
                                setIsInventoryPopoverOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedInventoryUuid === item.uuid ? "opacity-100" : "opacity-0")} />
                              {item.name}
                              <span className="ml-auto text-zinc-400 text-xs">{item.unit_measurement}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Quantity + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity <span className="text-red-500">*</span></Label>
                  <div className="flex items-center gap-0">
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 10"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      disabled={isSubmitting}
                      className="rounded-r-none"
                    />
                    <span className="h-9 px-3 flex items-center border border-l-0 rounded-r-md bg-zinc-50 text-zinc-500 text-sm whitespace-nowrap">
                      {selectedUnitLabel || "unit"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Type <span className="text-red-500">*</span></Label>
                  <Select
                    value={transactionType}
                    onValueChange={(val) => {
                      setTransactionType(val);
                      if (val === "OUT") {
                        setCost("0");
                        setSupplier("");
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">IN — Received</SelectItem>
                      <SelectItem value="OUT">OUT — Used</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cost */}
              <div className="space-y-2">
                <Label htmlFor="cost" className={transactionType === "OUT" ? "text-zinc-400" : ""}>
                  Cost
                  {transactionType === "OUT" && (
                    <span className="ml-2 text-xs text-zinc-400 font-normal">N/A for outgoing stock</span>
                  )}
                </Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  disabled={isSubmitting || transactionType === "OUT"}
                  className={transactionType === "OUT" ? "bg-zinc-50 text-zinc-400 cursor-not-allowed" : ""}
                />
              </div>

              {/* Supplier */}
              <div className="space-y-2">
                <Label htmlFor="supplier" className={transactionType === "OUT" ? "text-zinc-400" : ""}>
                  Supplier
                  {transactionType === "OUT" ? (
                    <span className="ml-2 text-xs text-zinc-400 font-normal">N/A for outgoing stock</span>
                  ) : (
                    <span className="text-zinc-400 text-xs"> (optional)</span>
                  )}
                </Label>
                <Input
                  id="supplier"
                  placeholder="e.g. ABC Wholesale Ltd."
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  disabled={isSubmitting || transactionType === "OUT"}
                  className={transactionType === "OUT" ? "bg-zinc-50 text-zinc-400 cursor-not-allowed" : ""}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="bg-black text-white hover:bg-zinc-800">
                  {isSubmitting ? "Processing..." : (editUuid ? "Update Transaction" : "Save Transaction")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>{/* end buttons row */}
      </div>{/* end header */}

      {/* Table */}
      <div className="bg-white rounded-md border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50">
              <TableHead className="font-medium">Item</TableHead>
              <TableHead className="font-medium">Quantity</TableHead>
              <TableHead className="font-medium">Type</TableHead>
              <TableHead className="font-medium">Cost</TableHead>
              <TableHead className="font-medium">Status</TableHead>
              <TableHead className="font-medium">Supplier</TableHead>
              <TableHead className="font-medium">Date</TableHead>
              <TableHead className="text-right font-medium">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground italic">
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground italic">
                  No transactions found. Click "Add Transaction" to get started.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.uuid} className="hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="font-medium">{t.inventory_name}</TableCell>
                  <TableCell className="text-zinc-700 font-medium">
                    {t.quantity}
                    <span className="ml-1 text-zinc-400 font-normal text-sm">{t.unit_measurement}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("border-none capitalize font-normal", typeColors[t.transaction_type])}>
                      {t.transaction_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-500">{t.cost.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("border-none capitalize font-normal", statusColors[t.status])}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-500 italic">{t.supplier || "—"}</TableCell>
                  <TableCell className="text-zinc-500 text-sm">{formatDate(t.datetime)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {t.status === "PENDING" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-500 hover:text-emerald-600"
                            title="Approve"
                            onClick={() => handleStatusChange(t.uuid, "APPROVED")}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-500 hover:text-red-600"
                            title="Reject"
                            onClick={() => handleStatusChange(t.uuid, "REJECTED")}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-black"
                        onClick={() => handleEdit(t)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-red-600"
                        onClick={() => handleDelete(t.uuid)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
