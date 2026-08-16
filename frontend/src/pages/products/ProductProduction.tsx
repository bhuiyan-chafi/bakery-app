import React, { useEffect, useState } from "react";
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
import { Plus, Trash2, PlayCircle, CheckCircle2, Clock, CheckSquare } from "lucide-react";
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

interface ProductionRecord {
  uuid: string;
  recipe_uuid: string;
  recipe_name: string;
  status: "pending" | "running" | "finished" | "completed";
  produced_at: string | null;
  notes: string | null;
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
  const canView = hasAnyPermission("production:view", "production:manage");
  const canManage = hasPermission("production:manage");

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productions, setProductions] = useState<ProductionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // For the finished block
  const [endProductsState, setEndProductsState] = useState<Record<string, EndProductEntry[]>>({});

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
        fetch(`${API_BASE_URL}/recipes/`, { headers: authHeaders }),
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

        {canManage && (
          <Button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-black text-white hover:bg-zinc-800 shrink-0 mt-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Start Production
          </Button>
        )}
      </div>

      {/* Production Log */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Production Log</h2>
        <div className="bg-white border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50">
                <TableHead className="font-medium">Recipe</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium">Completed At</TableHead>
                <TableHead className="font-medium">Notes</TableHead>
                {canManage && <TableHead className="text-right font-medium">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 5 : 4} className="text-center py-10 text-muted-foreground italic">Loading...</TableCell>
                </TableRow>
              ) : productions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 5 : 4} className="text-center py-10 text-muted-foreground italic">No production records yet.</TableCell>
                </TableRow>
              ) : (
                productions.map((p) => {
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
                        <TableCell className="text-zinc-500 text-sm">{formatDate(p.produced_at)}</TableCell>
                        <TableCell className="text-zinc-500 italic text-sm max-w-[200px] truncate">{p.notes || "—"}</TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {next && next !== "completed" && (
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
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-zinc-400 hover:text-red-600"
                                onClick={() => handleDelete(p.uuid)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>

                      {/* Expanded End-Product Block for FINISHED status */}
                      {canManage && p.status === "finished" && (
                        <TableRow className="bg-purple-50/30">
                          <TableCell colSpan={5} className="px-6 py-4">
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
    </div>
  );
}
