import { useEffect, useState, useMemo } from "react";
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
import { Plus, Pencil, Trash2, ChevronsUpDown, Check, ClipboardList, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/config/constants";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

interface InventoryItem {
  uuid: string;
  name: string;
  unit_uuid: string;
  unit_measurement: string;
  quantity_alert: number;
  current_stock: number;
}

interface UnitMeasurement {
  uuid: string;
  name: string;
  measurement: string;
}

export default function InventoryPage() {
  const { hasPermission, hasAnyPermission, isLoading: isLoadingPermissions } = usePermissions();
  const canView = hasAnyPermission("inventory:view", "inventory:add", "inventory:view-purchase", "inventory:manage-purchase");
  const canAdd = hasPermission("inventory:add");
  const canViewPurchase = hasAnyPermission("inventory:view-purchase", "inventory:manage-purchase");

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [units, setUnits] = useState<UnitMeasurement[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof InventoryItem, direction: 'asc' | 'desc' } | null>(null);

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item => 
        (item.name?.toLowerCase().includes(lowerSearch)) ||
        (item.unit_measurement?.toLowerCase().includes(lowerSearch))
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any = a[sortConfig.key];
        let bValue: any = b[sortConfig.key];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, searchTerm, sortConfig]);

  const handleSort = (key: keyof InventoryItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof InventoryItem }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-1 w-3 h-3 inline text-zinc-300" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-1 w-3 h-3 inline text-black" />
      : <ArrowDown className="ml-1 w-3 h-3 inline text-black" />;
  };
  const [filteredUnits, setFilteredUnits] = useState<UnitMeasurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnitPopoverOpen, setIsUnitPopoverOpen] = useState(false);

  // Form state
  const [editUuid, setEditUuid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selectedUnitUuid, setSelectedUnitUuid] = useState("");
  const [selectedUnitLabel, setSelectedUnitLabel] = useState("Select a unit");
  const [quantityAlert, setQuantityAlert] = useState<string>("0");

  useEffect(() => {
    if (canView) {
      fetchItems();
      fetchUnits();
    } else if (!isLoadingPermissions) {
      setIsLoading(false);
    }
  }, [canView, isLoadingPermissions]);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/inventory/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch inventory");
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/settings/measurement-unit`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch measurement units");
      const data = await response.json();
      const unitList = Array.isArray(data) ? data : [];
      setUnits(unitList);
      setFilteredUnits(unitList);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUnitSearch = (query: string) => {
    if (!query) {
      setFilteredUnits(units);
      return;
    }
    setFilteredUnits(
      units.filter((u) =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.measurement.toLowerCase().includes(query.toLowerCase())
      )
    );
  };

  const resetForm = () => {
    setEditUuid(null);
    setName("");
    setSelectedUnitUuid("");
    setSelectedUnitLabel("Select a unit");
    setQuantityAlert("0");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Inventory name is required");
      return;
    }
    if (!selectedUnitUuid) {
      toast.error("Unit of measurement is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const url = editUuid
        ? `${API_BASE_URL}/inventory/${editUuid}`
        : `${API_BASE_URL}/inventory/`;
      const method = editUuid ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          unit_uuid: selectedUnitUuid,
          quantity_alert: parseFloat(quantityAlert) || 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Operation failed");
      }

      toast.success(editUuid ? "Item updated successfully" : "Item added successfully");
      setIsModalOpen(false);
      resetForm();
      fetchItems();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditUuid(item.uuid);
    setName(item.name);
    setSelectedUnitUuid(item.unit_uuid);
    const unit = units.find((u) => u.uuid === item.unit_uuid);
    setSelectedUnitLabel(unit ? `${unit.name} (${unit.measurement})` : item.unit_measurement);
    setQuantityAlert(String(item.quantity_alert));
    setIsModalOpen(true);
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm("Are you sure you want to delete this inventory item?")) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/inventory/${uuid}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete item");
      }
      toast.success("Item deleted successfully");
      fetchItems();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (!isLoadingPermissions && !canView) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900 mb-1">Access Restricted</h2>
        <p className="text-sm text-zinc-500">You do not have permission to view inventory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-3">
          {/* Title row */}
          <div>
            <h1 className="text-3xl font-light tracking-tight">Inventory</h1>
            <p className="text-muted-foreground mt-1">Manage raw materials and ingredients used in production.</p>
          </div>

          {/* Action buttons row */}
          <div className="flex flex-wrap items-center gap-2">
          {canViewPurchase && (
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link to="/inventory/manage" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Manage Inventory
              </Link>
            </Button>
          )}

          {canAdd && (
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
                  Add Item
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editUuid ? "Edit Item" : "Add New Item"}</DialogTitle>
                <DialogDescription>
                  {editUuid ? "Update the details of this inventory item." : "Add a new raw material or ingredient."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="inv-name">Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="inv-name"
                    placeholder="e.g. All-purpose Flour"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2 flex flex-col">
                  <Label>Unit of Measurement <span className="text-red-500">*</span></Label>
                  <Popover open={isUnitPopoverOpen} onOpenChange={setIsUnitPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isUnitPopoverOpen}
                        className="w-full justify-between font-normal text-left"
                        disabled={isSubmitting}
                      >
                        {selectedUnitLabel}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[375px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput placeholder="Search units..." onValueChange={handleUnitSearch} />
                        <CommandList>
                          <CommandEmpty>No units found.</CommandEmpty>
                          <CommandGroup>
                            {filteredUnits.map((unit) => (
                              <CommandItem
                                key={unit.uuid}
                                value={unit.uuid}
                                onSelect={() => {
                                  setSelectedUnitUuid(unit.uuid);
                                  setSelectedUnitLabel(`${unit.name} (${unit.measurement})`);
                                  setIsUnitPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedUnitUuid === unit.uuid ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {unit.name} <span className="ml-1 text-zinc-400">({unit.measurement})</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qty-alert">Quantity Alert Threshold</Label>
                  <Input
                    id="qty-alert"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 5.0"
                    value={quantityAlert}
                    onChange={(e) => setQuantityAlert(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting} className="bg-black text-white hover:bg-zinc-800">
                    {isSubmitting ? "Processing..." : (editUuid ? "Update Item" : "Save Item")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
        </div>
        <div className="relative w-full sm:w-72 mt-2 sm:mt-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input 
            placeholder="Search inventory..." 
            className="pl-9 h-9 w-full bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-md border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50">
              <TableHead className="font-medium cursor-pointer hover:bg-zinc-100" onClick={() => handleSort('name')}>Name <SortIcon columnKey="name" /></TableHead>
              <TableHead className="font-medium cursor-pointer hover:bg-zinc-100" onClick={() => handleSort('unit_measurement')}>Unit <SortIcon columnKey="unit_measurement" /></TableHead>
              <TableHead className="font-medium cursor-pointer hover:bg-zinc-100" onClick={() => handleSort('current_stock')}>Stock <SortIcon columnKey="current_stock" /></TableHead>
              <TableHead className="font-medium cursor-pointer hover:bg-zinc-100" onClick={() => handleSort('quantity_alert')}>Alert Qty <SortIcon columnKey="quantity_alert" /></TableHead>
              {canAdd && <TableHead className="text-right font-medium">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={canAdd ? 5 : 4} className="text-center py-10 text-muted-foreground italic">
                  Loading inventory...
                </TableCell>
              </TableRow>
            ) : filteredAndSortedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canAdd ? 5 : 4} className="text-center py-10 text-muted-foreground italic">
                  No inventory items found. {canAdd ? 'Click "Add Item" to get started.' : ''}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedItems.map((item) => (
                <TableRow key={item.uuid} className="hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-zinc-500">{item.unit_measurement}</TableCell>
                  <TableCell>
                    <span className={item.current_stock <= item.quantity_alert ? "text-red-600 font-medium" : "text-zinc-700"}>
                      {item.current_stock}
                      {item.current_stock <= item.quantity_alert && (
                        <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Low</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-zinc-500">{item.quantity_alert}</TableCell>
                  {canAdd && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-500 hover:text-black"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-500 hover:text-red-600"
                          onClick={() => handleDelete(item.uuid)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
