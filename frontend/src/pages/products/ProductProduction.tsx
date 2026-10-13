import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, PlayCircle, CheckCircle2, Clock, CheckSquare, Search, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Package, Filter, RotateCcw } from "lucide-react";
import { API_BASE_URL } from "@/config/constants";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

interface Recipe {
  uuid: string;
  name: string;
}

interface Product {
  uuid: string;
  name: string;
}

interface EndProductYield {
  uuid?: string;
  product_uuid: string;
  product_name?: string | null;
  quantity: number;
}

interface ProductionRecord {
  uuid: string;
  recipe_uuid: string;
  recipe_name: string;
  status: "pending" | "running" | "finished" | "completed";
  produced_at: string | null;
  notes: string | null;
  end_products?: EndProductYield[];
}

interface EndProductEntry {
  id: string;
  product_uuid: string;
  quantity: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending",   color: "bg-amber-100 text-amber-700" },
  running:   { label: "Running",   color: "bg-blue-100 text-blue-700" },
  finished:  { label: "Finished",  color: "bg-purple-100 text-purple-700" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700" },
};

const nextStatus: Record<string, string | null> = {
  pending: "running",
  running: "finished",
  finished: "completed",
  completed: null,
};

export default function ProductionPage() {
  const { hasPermission, hasAnyPermission, isLoading: isLoadingPermissions } = usePermissions();
  const canView = hasAnyPermission("production:view", "production:add", "production:edit", "production:delete");
  const canAdd = hasPermission("production:add");
  const canEdit = hasPermission("production:edit");
  const canDelete = hasPermission("production:delete");
  const hasActionColumn = canEdit || canDelete;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productions, setProductions] = useState<ProductionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [recipeSearch, setRecipeSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: 'recipe_name' | 'status' | 'produced_at', direction: 'asc' | 'desc' } | null>(null);

  const handleResetFilters = () => {
    setRecipeSearch("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
  };

  const filteredAndSortedProductions = useMemo(() => {
    let result = [...productions];

    // 1. Search by Recipe Name
    if (recipeSearch.trim()) {
      const lower = recipeSearch.toLowerCase();
      result = result.filter(p => p.recipe_name?.toLowerCase().includes(lower));
    }

    // 2. Search by Status
    if (statusFilter && statusFilter !== "all") {
      result = result.filter(p => p.status === statusFilter);
    }

    // 3. Search by Date Range (excluding time)
    if (startDate || endDate) {
      result = result.filter(p => {
        if (!p.produced_at) return false;
        const prodDate = p.produced_at.split("T")[0]; // YYYY-MM-DD
        if (startDate && prodDate < startDate) return false;
        if (endDate && prodDate > endDate) return false;
        return true;
      });
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any = a[sortConfig.key];
        let bValue: any = b[sortConfig.key];

        if (sortConfig.key === 'produced_at') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Completed productions remain below, all active/in-progress on top
      result.sort((a, b) => {
        const aCompleted = a.status === "completed" ? 1 : 0;
        const bCompleted = b.status === "completed" ? 1 : 0;
        if (aCompleted !== bCompleted) {
          return aCompleted - bCompleted;
        }
        if (aCompleted === 1) {
          const aTime = a.produced_at ? new Date(a.produced_at).getTime() : 0;
          const bTime = b.produced_at ? new Date(b.produced_at).getTime() : 0;
          return bTime - aTime;
        }
        return 0;
      });
    }

    return result;
  }, [productions, recipeSearch, statusFilter, startDate, endDate, sortConfig]);

  const handleSort = (key: 'recipe_name' | 'status' | 'produced_at') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: 'recipe_name' | 'status' | 'produced_at' }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-1 w-3 h-3 inline text-zinc-300" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-1 w-3 h-3 inline text-black" />
      : <ArrowDown className="ml-1 w-3 h-3 inline text-black" />;
  };

  // For the finished block
  const [endProductsState, setEndProductsState] = useState<Record<string, EndProductEntry[]>>({});

  // Edit modal state
  const [editingProduction, setEditingProduction] = useState<ProductionRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editEndProducts, setEditEndProducts] = useState<{ id: string; product_uuid: string; quantity: string }[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form state
  const [selectedRecipeUuid, setSelectedRecipeUuid] = useState("");
  const [notes, setNotes] = useState("");
  const [shortfalls, setShortfalls] = useState<{
    inventory_name: string;
    unit: string;
    required: number;
    available: number;
    shortfall: number;
  }[]>([]);

  useEffect(() => {
    if (canView) {
      fetchAll();
    } else if (!isLoadingPermissions) {
      setIsLoading(false);
    }
  }, [canView, isLoadingPermissions]);

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem("token");
      const authHeaders = { "Authorization": `Bearer ${token}` };

      const [recipesRes, productionsRes, productsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/recipes/names`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/productions/`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/products/`, { headers: authHeaders }),
      ]);

      if (recipesRes.ok) {
        const recipeList = await recipesRes.json();
        if (Array.isArray(recipeList)) {
          setRecipes(recipeList);
          if (recipeList.length > 0 && !selectedRecipeUuid) {
            setSelectedRecipeUuid(recipeList[0].uuid);
          }
        } else {
          setRecipes([]);
        }
      } else {
        setRecipes([]);
      }

      if (productionsRes.ok) {
        const prodList = await productionsRes.json();
        setProductions(Array.isArray(prodList) ? prodList : []);
      } else {
        setProductions([]);
      }

      if (productsRes.ok) {
        const prodList = await productsRes.json();
        setProducts(Array.isArray(prodList) ? prodList : []);
      } else {
        setProducts([]);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedRecipeUuid(recipes[0]?.uuid || "");
    setNotes("");
    setShortfalls([]);
  };

  const handleOpenEdit = (prod: ProductionRecord) => {
    setEditingProduction(prod);
    setEditNotes(prod.notes || "");
    if (prod.end_products && prod.end_products.length > 0) {
      setEditEndProducts(
        prod.end_products.map(ep => ({
          id: crypto.randomUUID(),
          product_uuid: ep.product_uuid,
          quantity: String(ep.quantity)
        }))
      );
    } else {
      setEditEndProducts([
        { id: crypto.randomUUID(), product_uuid: products[0]?.uuid || "", quantity: "1" }
      ]);
    }
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduction) return;

    if (editingProduction.status === "completed") {
      if (editEndProducts.length === 0) {
        toast.error("Please add at least one product yield for a completed production");
        return;
      }
      for (const entry of editEndProducts) {
        if (!entry.product_uuid) {
          toast.error("Please select a product for all rows");
          return;
        }
        if (!entry.quantity || parseFloat(entry.quantity) <= 0) {
          toast.error("All product quantities must be greater than zero");
          return;
        }
      }
    }

    setIsUpdating(true);
    try {
      const token = localStorage.getItem("token");
      const payload: any = {
        notes: editNotes || null,
        end_products: editEndProducts.map(e => ({
          product_uuid: e.product_uuid,
          quantity: parseFloat(e.quantity)
        }))
      };

      const res = await fetch(`${API_BASE_URL}/productions/${editingProduction.uuid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update production");

      toast.success("Production updated successfully!");
      setIsEditModalOpen(false);
      setEditingProduction(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipeUuid) { toast.error("Please select a recipe"); return; }

    setIsSaving(true);
    setShortfalls([]);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/productions/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          recipe_uuid: selectedRecipeUuid,
          notes: notes || null,
        }),
      });

      const data = await res.json();

      if (res.status === 422 && data.shortfalls) {
        setShortfalls(data.shortfalls);
        toast.error("Insufficient stock — see details below");
        return;
      }

      if (!res.ok) throw new Error(data.error || "Failed to start production");

      toast.success("Production started — status: Pending");
      resetForm();
      setIsModalOpen(false);
      fetchAll();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusAdvance = async (prod: ProductionRecord) => {
    const next = nextStatus[prod.status];
    if (!next) return;

    const token = localStorage.getItem("token");
    const authHeaders = { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };

    if (next === "finished") {
      // Just update status to finished
      try {
        const res = await fetch(`${API_BASE_URL}/productions/${prod.uuid}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ status: next })
        });
        if (!res.ok) throw new Error("Failed to finish production");
        toast.success(`Production marked as Finished`);
        // Initialize one empty row for the finished block
        setEndProductsState(prev => ({
          ...prev,
          [prod.uuid]: [{ id: crypto.randomUUID(), product_uuid: "", quantity: "1" }]
        }));
        fetchAll();
      } catch (error: any) {
        toast.error(error.message);
      }
      return;
    }

    if (next === "completed") {
      // Submit the end products
      const entries = endProductsState[prod.uuid] || [];
      if (entries.length === 0) {
        toast.error("Please add at least one end-product before completing");
        return;
      }

      for (const entry of entries) {
        if (!entry.product_uuid) {
          toast.error("Please select a product for all rows");
          return;
        }
        if (!entry.quantity || parseFloat(entry.quantity) <= 0) {
          toast.error("Quantity must be greater than zero");
          return;
        }
      }

      try {
        const payload = {
          status: "completed",
          end_products: entries.map(e => ({
            product_uuid: e.product_uuid,
            quantity: parseFloat(e.quantity)
          }))
        };

        const res = await fetch(`${API_BASE_URL}/productions/${prod.uuid}`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to complete production");
        }

        toast.success("Production completed and products logged!");
        setEndProductsState(prev => { const s = { ...prev }; delete s[prod.uuid]; return s; });
        fetchAll();
      } catch (error: any) {
        toast.error(error.message);
      }
      return;
    }

    // Default status advance (pending -> running)
    try {
      const res = await fetch(`${API_BASE_URL}/productions/${prod.uuid}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status: next })
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Status updated to "${next}"`);
      fetchAll();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (prodUuid: string) => {
    if (!confirm("Delete this production record?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/productions/${prodUuid}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Production record deleted");
      fetchAll();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString("en-GB", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      : "—";

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "pending")   return <Clock className="w-3.5 h-3.5" />;
    if (status === "running")   return <PlayCircle className="w-3.5 h-3.5" />;
    if (status === "finished")  return <CheckSquare className="w-3.5 h-3.5" />;
    if (status === "completed") return <CheckCircle2 className="w-3.5 h-3.5" />;
    return null;
  };

  const addEndProductRow = (prodUuid: string) => {
    setEndProductsState(prev => ({
      ...prev,
      [prodUuid]: [
        ...(prev[prodUuid] || []),
        { id: crypto.randomUUID(), product_uuid: "", quantity: "1" }
      ]
    }));
  };

  const removeEndProductRow = (prodUuid: string, rowId: string) => {
    setEndProductsState(prev => ({
      ...prev,
      [prodUuid]: (prev[prodUuid] || []).filter(r => r.id !== rowId)
    }));
  };

  const updateEndProductRow = (prodUuid: string, rowId: string, field: "product_uuid" | "quantity", val: string) => {
    setEndProductsState(prev => ({
      ...prev,
      [prodUuid]: (prev[prodUuid] || []).map(r => r.id === rowId ? { ...r, [field]: val } : r)
    }));
  };

  if (!isLoadingPermissions && !canView) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900 mb-1">Access Restricted</h2>
        <p className="text-sm text-zinc-500">You do not have permission to view production.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Production</h1>
          <p className="text-muted-foreground mt-1">
            Record recipe production and log end-product yields.
          </p>
        </div>

        {canAdd && (
          <Button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-black text-white hover:bg-zinc-800 shrink-0 mt-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Start Production
          </Button>
        )}
      </div>

      {/* ── Field-based Search & Filter Panel ── */}
      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            Filter Productions
          </h2>
          {(recipeSearch || statusFilter !== "all" || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 text-xs text-zinc-500 hover:text-black gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Option 1: Search by Recipe Name */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600 font-medium">Recipe Name</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                placeholder="Search recipe..."
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                className="pl-8 h-9 text-sm bg-white"
              />
            </div>
          </div>

          {/* Option 2: Search by Status */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600 font-medium">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-sm bg-white">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="finished">Finished</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Option 3: Search by Date Range (From Date) */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600 font-medium">From Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 text-sm bg-white"
            />
          </div>

          {/* Option 3: Search by Date Range (To Date) */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-600 font-medium">To Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 text-sm bg-white"
            />
          </div>
        </div>
      </div>

      {/* Production Log Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Production Log</h2>
          <span className="text-xs text-muted-foreground">
            Showing {filteredAndSortedProductions.length} of {productions.length} records
          </span>
        </div>
        <div className="bg-white border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50">
                <TableHead className="font-medium cursor-pointer hover:bg-zinc-100" onClick={() => handleSort('recipe_name')}>Recipe <SortIcon columnKey="recipe_name" /></TableHead>
                <TableHead className="font-medium cursor-pointer hover:bg-zinc-100" onClick={() => handleSort('status')}>Status <SortIcon columnKey="status" /></TableHead>
                <TableHead className="font-medium">Products Produced</TableHead>
                <TableHead className="font-medium cursor-pointer hover:bg-zinc-100" onClick={() => handleSort('produced_at')}>Completed At <SortIcon columnKey="produced_at" /></TableHead>
                <TableHead className="font-medium">Notes</TableHead>
                {hasActionColumn && <TableHead className="text-right font-medium">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={hasActionColumn ? 6 : 5} className="text-center py-10 text-muted-foreground italic">Loading...</TableCell>
                </TableRow>
              ) : filteredAndSortedProductions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasActionColumn ? 6 : 5} className="text-center py-10 text-muted-foreground italic">No production records found.</TableCell>
                </TableRow>
              ) : (
                filteredAndSortedProductions.map((p) => {
                  const cfg = statusConfig[p.status];
                  const next = nextStatus[p.status];
                  return (
                    <React.Fragment key={p.uuid}>
                      <TableRow className="hover:bg-zinc-50/50 transition-colors">
                        <TableCell className="font-medium">{p.recipe_name}</TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", cfg.color)}>
                            <StatusIcon status={p.status} />
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.end_products && p.end_products.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {p.end_products.map((ep, idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                                  <Package className="w-3 h-3 mr-1 text-zinc-500" />
                                  {ep.quantity} × {ep.product_name || "Product"}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-sm">{formatDate(p.produced_at)}</TableCell>
                        <TableCell className="text-zinc-500 italic text-sm max-w-[200px] truncate">{p.notes || "—"}</TableCell>
                        {hasActionColumn && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {canEdit && next && next !== "completed" && (
                                <Button
                                  variant="ghost" size="sm"
                                  className={cn(
                                    "h-8 text-xs gap-1.5",
                                    next === "running" && "text-blue-600 hover:text-blue-700",
                                    next === "finished" && "text-purple-600 hover:text-purple-700"
                                  )}
                                  onClick={() => handleStatusAdvance(p)}
                                >
                                  {next === "running" ? <PlayCircle className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                                  {next === "running" ? "Start" : "Finish"}
                                </Button>
                              )}
                              {canEdit && (
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 text-zinc-400 hover:text-blue-600"
                                  onClick={() => handleOpenEdit(p)}
                                  title="Edit Production"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 text-zinc-400 hover:text-red-600"
                                  onClick={() => handleDelete(p.uuid)}
                                  title="Delete Production"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>

                      {/* Expanded End-Product Block for FINISHED status */}
                      {canEdit && p.status === "finished" && (
                        <TableRow className="bg-purple-50/30">
                          <TableCell colSpan={hasActionColumn ? 6 : 5} className="px-6 py-4">
                            <div className="bg-white border border-purple-100 rounded-md p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h3 className="font-medium text-sm text-purple-900">Log End-Products</h3>
                                  <p className="text-xs text-purple-600">Select the products and quantities yielded from this recipe.</p>
                                </div>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addEndProductRow(p.uuid)}>
                                  <Plus className="w-3 h-3 mr-1" /> Add Product
                                </Button>
                              </div>

                              <div className="space-y-2">
                                {(endProductsState[p.uuid] || []).map(row => (
                                  <div key={row.id} className="flex items-center gap-2">
                                    <Select value={row.product_uuid} onValueChange={(v) => updateEndProductRow(p.uuid, row.id, "product_uuid", v)}>
                                      <SelectTrigger className="w-[200px] h-8 text-sm">
                                        <SelectValue placeholder="Select product..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {products.map(prod => (
                                          <SelectItem key={prod.uuid} value={prod.uuid}>{prod.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    
                                    <Input
                                      type="number" step="any" min="0" placeholder="Qty"
                                      value={row.quantity}
                                      onChange={(e) => updateEndProductRow(p.uuid, row.id, "quantity", e.target.value)}
                                      className="w-24 h-8 text-sm"
                                    />
                                    
                                    <Button
                                      variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600"
                                      onClick={() => removeEndProductRow(p.uuid, row.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                                {(endProductsState[p.uuid] || []).length === 0 && (
                                  <p className="text-xs text-muted-foreground italic py-2">No products added. Click "Add Product".</p>
                                )}
                              </div>

                              <div className="mt-4 flex justify-end">
                                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5" onClick={() => handleStatusAdvance(p)}>
                                  <CheckCircle2 className="w-4 h-4" /> Complete Production
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Start Production Modal ── */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Start New Production</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRecord} className="space-y-4 pt-1">
            {/* Recipe */}
            <div className="space-y-2">
              <Label>Recipe <span className="text-red-500">*</span></Label>
              {recipes.length === 0 ? (
                <p className="text-sm text-amber-600 italic">
                  No recipes defined yet.{" "}
                  <Link to="/recipes" className="underline" onClick={() => setIsModalOpen(false)}>
                    Create one first.
                  </Link>
                </p>
              ) : (
                <Select value={selectedRecipeUuid} onValueChange={setSelectedRecipeUuid} disabled={isSaving}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select recipe..." />
                  </SelectTrigger>
                  <SelectContent>
                    {recipes.map((r) => (
                      <SelectItem key={r.uuid} value={r.uuid}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="prod-notes">Notes <span className="text-zinc-400 text-xs">(optional)</span></Label>
              <Textarea
                id="prod-notes" placeholder="Any notes about this run..."
                value={notes} onChange={(e) => setNotes(e.target.value)}
                disabled={isSaving} className="min-h-[80px] resize-y"
              />
            </div>

            {/* Shortfall panel inside modal */}
            {shortfalls.length > 0 && (
              <div className="border border-red-200 bg-red-50 rounded-md p-3 space-y-2">
                <p className="text-red-600 font-semibold text-sm">⚠ Insufficient Stock</p>
                <div className="overflow-hidden rounded border border-red-200">
                  <table className="w-full text-xs">
                    <thead className="bg-red-100 text-red-700">
                      <tr>
                        <th className="text-left px-3 py-1.5 font-medium">Ingredient</th>
                        <th className="text-right px-3 py-1.5 font-medium">Required</th>
                        <th className="text-right px-3 py-1.5 font-medium">Available</th>
                        <th className="text-right px-3 py-1.5 font-medium">Short by</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100 bg-white">
                      {shortfalls.map((sf, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 font-medium text-zinc-700">{sf.inventory_name}</td>
                          <td className="px-3 py-1.5 text-right text-zinc-600">{sf.required} {sf.unit}</td>
                          <td className="px-3 py-1.5 text-right text-zinc-600">{sf.available} {sf.unit}</td>
                          <td className="px-3 py-1.5 text-right text-red-600 font-semibold">{sf.shortfall} {sf.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || recipes.length === 0} className="bg-black text-white hover:bg-zinc-800">
                <Plus className="w-4 h-4 mr-2" />
                {isSaving ? "Recording..." : "Start Production"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Production Modal ── */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => { setIsEditModalOpen(open); if (!open) setEditingProduction(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Production</DialogTitle>
          </DialogHeader>

          {editingProduction && (
            <form onSubmit={handleSaveEdit} className="space-y-4 pt-1">
              {/* Recipe & Status Summary */}
              <div className="flex items-center justify-between p-3 bg-zinc-50 border rounded-lg text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Recipe</span>
                  <span className="font-medium">{editingProduction.recipe_name}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Current Status</span>
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", statusConfig[editingProduction.status]?.color)}>
                    <StatusIcon status={editingProduction.status} />
                    {statusConfig[editingProduction.status]?.label}
                  </span>
                </div>
              </div>

              {/* Produced Products Yield list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium text-sm">
                    Products Produced {editingProduction.status === "completed" && <span className="text-red-500">*</span>}
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      setEditEndProducts(prev => [
                        ...prev,
                        { id: crypto.randomUUID(), product_uuid: products[0]?.uuid || "", quantity: "1" }
                      ]);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Product
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Adjust the number of products yielded from this production. Changes immediately update the product inventory.
                </p>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {editEndProducts.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <Select
                        value={row.product_uuid}
                        onValueChange={(val) => {
                          setEditEndProducts(prev => prev.map(r => r.id === row.id ? { ...r, product_uuid: val } : r));
                        }}
                      >
                        <SelectTrigger className="flex-1 h-8 text-sm bg-white">
                          <SelectValue placeholder="Select product..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(prod => (
                            <SelectItem key={prod.uuid} value={prod.uuid}>{prod.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        step="any"
                        min="0.01"
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditEndProducts(prev => prev.map(r => r.id === row.id ? { ...r, quantity: val } : r));
                        }}
                        className="w-24 h-8 text-sm bg-white"
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-red-600 shrink-0"
                        onClick={() => {
                          setEditEndProducts(prev => prev.filter(r => r.id !== row.id));
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {editEndProducts.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2 text-center border border-dashed rounded p-3">
                      No products logged. Click "Add Product" above to record output.
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="edit-prod-notes">Notes <span className="text-zinc-400 text-xs">(optional)</span></Label>
                <Textarea
                  id="edit-prod-notes"
                  placeholder="Notes about this production run..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  disabled={isUpdating}
                  className="min-h-[70px] resize-y text-sm"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setIsEditModalOpen(false); setEditingProduction(null); }}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating} className="bg-black text-white hover:bg-zinc-800">
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
