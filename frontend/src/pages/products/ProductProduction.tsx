import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import { ArrowLeft, Plus, Trash2, PlayCircle, CheckCircle2, Clock } from "lucide-react";
import { API_BASE_URL } from "@/config/constants";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";

interface Recipe {
  uuid: string;
  name: string;
}

interface ProductionRecord {
  uuid: string;
  recipe_uuid: string;
  recipe_name: string;
  yield_type: string;
  batch_quantity: number | null;
  status: "pending" | "running" | "completed";
  produced_at: string | null;
  notes: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending",   color: "bg-amber-100 text-amber-700" },
  running:   { label: "Running",   color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700" },
};

const nextStatus: Record<string, string | null> = {
  pending: "running",
  running: "completed",
  completed: null,
};

export default function ProductProduction() {
  const { uuid: productUuid } = useParams<{ uuid: string }>();

  const [productName, setProductName] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [productions, setProductions] = useState<ProductionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [selectedRecipeUuid, setSelectedRecipeUuid] = useState("");
  const [yieldType, setYieldType] = useState("single");
  const [batchQuantity, setBatchQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [shortfalls, setShortfalls] = useState<{
    inventory_name: string;
    unit: string;
    required: number;
    available: number;
    shortfall: number;
  }[]>([]);

  useEffect(() => { fetchAll(); }, [productUuid]);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [productRes, recipesRes, productionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products/`),
        fetch(`${API_BASE_URL}/products/${productUuid}/recipes`),
        fetch(`${API_BASE_URL}/products/${productUuid}/production`),
      ]);

      const allProducts = await productRes.json();
      const found = allProducts.find((p: any) => p.uuid === productUuid);
      if (found) setProductName(found.name);

      const recipesData = await recipesRes.json();
      const recipeList: Recipe[] = recipesData.recipes || [];
      setRecipes(recipeList);
      if (recipeList.length > 0 && !selectedRecipeUuid) {
        setSelectedRecipeUuid(recipeList[0].uuid);
      }

      const productionsData = await productionsRes.json();
      setProductions(productionsData);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedRecipeUuid(recipes[0]?.uuid || "");
    setYieldType("single");
    setBatchQuantity("1");
    setNotes("");
  };

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipeUuid) { toast.error("Please select a recipe"); return; }
    if (yieldType === "batch" && (!batchQuantity || parseFloat(batchQuantity) <= 0)) {
      toast.error("Batch quantity must be greater than zero"); return;
    }

    setIsSaving(true);
    setShortfalls([]);
    try {
      const res = await fetch(`${API_BASE_URL}/products/${productUuid}/production`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe_uuid: selectedRecipeUuid,
          yield_type: yieldType,
          batch_quantity: yieldType === "batch" ? parseFloat(batchQuantity) : null,
          notes: notes || null,
        }),
      });

      const data = await res.json();

      if (res.status === 422 && data.shortfalls) {
        setShortfalls(data.shortfalls);
        toast.error("Insufficient stock — see details below");
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to record production");
      }

      toast.success("Production started — status: Pending");
      resetForm();
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
    try {
      const res = await fetch(
        `${API_BASE_URL}/products/${productUuid}/production/${prod.uuid}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      toast.success(`Status updated to "${next}"`);
      fetchAll();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (prodUuid: string) => {
    if (!confirm("Delete this production record?")) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/products/${productUuid}/production/${prodUuid}`,
        { method: "DELETE" }
      );
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
    if (status === "completed") return <CheckCircle2 className="w-3.5 h-3.5" />;
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link to="/products" className="text-muted-foreground hover:text-black transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-3xl font-light tracking-tight">Production</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Record and track production runs for{" "}
          <span className="font-medium text-zinc-700">{productName || "..."}</span>.
        </p>
      </div>

      {/* Record form */}
      <div className="bg-white border rounded-md p-6 space-y-5">
        <h2 className="text-base font-semibold">Start New Production</h2>
        <form onSubmit={handleRecord} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            {/* Recipe */}
            <div className="space-y-2">
              <Label>Recipe <span className="text-red-500">*</span></Label>
              {recipes.length === 0 ? (
                <p className="text-sm text-amber-600 italic">
                  No recipes defined yet.{" "}
                  <Link to={`/products/${productUuid}/recipe`} className="underline">
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

            {/* Yield type */}
            <div className="space-y-2">
              <Label>Yield Type <span className="text-red-500">*</span></Label>
              <Select
                value={yieldType}
                onValueChange={(val) => { setYieldType(val); if (val === "single") setBatchQuantity("1"); }}
                disabled={isSaving}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single — one unit</SelectItem>
                  <SelectItem value="batch">Batch — multiple units</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Batch quantity — stays in col 3, hidden when single */}
            <div className="space-y-2">
              <Label htmlFor="batch-qty" className={yieldType !== "batch" ? "text-zinc-400" : ""}>
                Batch Quantity {yieldType === "batch" && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="batch-qty"
                type="number"
                step="1"
                min="1"
                placeholder="e.g. 12"
                value={batchQuantity}
                onChange={(e) => setBatchQuantity(e.target.value)}
                disabled={isSaving || yieldType !== "batch"}
                className={yieldType !== "batch" ? "opacity-40 cursor-not-allowed" : ""}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="prod-notes">Notes <span className="text-zinc-400 text-xs">(optional)</span></Label>
            <Textarea
              id="prod-notes"
              placeholder="Any notes about this run..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSaving}
              className="min-h-[80px] resize-y"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSaving || recipes.length === 0}
              className="bg-black text-white hover:bg-zinc-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isSaving ? "Recording..." : "Start Production"}
            </Button>
          </div>
        </form>
      </div>

      {/* ── Shortfall panel ── */}
      {shortfalls.length > 0 && (
        <div className="border border-red-200 bg-red-50 rounded-md p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-semibold text-sm">⚠ Insufficient Stock</span>
            <span className="text-red-500 text-xs">— the following items do not have enough approved stock to fulfil this production run.</span>
          </div>
          <div className="overflow-hidden rounded border border-red-200">
            <table className="w-full text-sm">
              <thead className="bg-red-100 text-red-700">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Ingredient</th>
                  <th className="text-right px-3 py-2 font-medium">Required</th>
                  <th className="text-right px-3 py-2 font-medium">Available</th>
                  <th className="text-right px-3 py-2 font-medium">Short by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100 bg-white">
                {shortfalls.map((sf, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium text-zinc-700">{sf.inventory_name}</td>
                    <td className="px-3 py-2 text-right text-zinc-600">{sf.required} {sf.unit}</td>
                    <td className="px-3 py-2 text-right text-zinc-600">{sf.available} {sf.unit}</td>
                    <td className="px-3 py-2 text-right text-red-600 font-semibold">{sf.shortfall} {sf.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History table */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Production Log</h2>
        <div className="bg-white border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50">
                <TableHead className="font-medium">Recipe</TableHead>
                <TableHead className="font-medium">Yield</TableHead>
                <TableHead className="font-medium">Batch Qty</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium">Completed At</TableHead>
                <TableHead className="font-medium">Notes</TableHead>
                <TableHead className="text-right font-medium">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">Loading...</TableCell>
                </TableRow>
              ) : productions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">No production records yet.</TableCell>
                </TableRow>
              ) : (
                productions.map((p) => {
                  const cfg = statusConfig[p.status];
                  const next = nextStatus[p.status];
                  return (
                    <TableRow key={p.uuid} className="hover:bg-zinc-50/50 transition-colors">
                      <TableCell className="font-medium">{p.recipe_name}</TableCell>
                      <TableCell>
                        <span className="capitalize text-zinc-600 text-sm">{p.yield_type}</span>
                      </TableCell>
                      <TableCell className="text-zinc-500">{p.batch_quantity ?? "—"}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", cfg.color)}>
                          <StatusIcon status={p.status} />
                          {cfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-zinc-500 text-sm">{formatDate(p.produced_at)}</TableCell>
                      <TableCell className="text-zinc-500 italic text-sm max-w-[160px] truncate">{p.notes || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {next && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-8 text-xs gap-1.5",
                                next === "running" && "text-blue-600 hover:text-blue-700",
                                next === "completed" && "text-emerald-600 hover:text-emerald-700"
                              )}
                              onClick={() => handleStatusAdvance(p)}
                              title={`Mark as ${next}`}
                            >
                              {next === "running" ? <PlayCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              {next === "running" ? "Start" : "Complete"}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-red-600"
                            onClick={() => handleDelete(p.uuid)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
