import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Plus,
  Pencil,
  Trash2,
  ChevronsUpDown,
  Check,
  ChevronUp,
  Eye,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { API_BASE_URL } from "@/config/constants";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

// ── Types ───────────────────────────────────────────────────────────────────

interface IngredientRow {
  id: string;
  inventory_uuid: string;
  inventory_name: string;
  unit_measurement: string;
  quantity: string;
  popoverOpen: boolean;
}

interface Recipe {
  uuid: string;
  name: string;
  instructions: string;
  ingredients: {
    uuid: string;
    inventory_uuid: string;
    inventory_name: string;
    unit_measurement: string;
    quantity: number;
  }[];
}

interface InventoryItem {
  uuid: string;
  name: string;
  unit_measurement: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function RecipePage() {
  const { hasPermission, hasAnyPermission, isLoading: isLoadingPermissions } = usePermissions();
  const canView = hasAnyPermission("recipe:view", "recipe:manage");
  const canManage = hasPermission("recipe:manage");

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Recipe, direction: 'asc' | 'desc' } | null>(null);

  const filteredAndSortedRecipes = useMemo(() => {
    let result = [...recipes];

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(r => 
        (r.name?.toLowerCase().includes(lowerSearch))
      );
    }

    if (sortConfig && sortConfig.key === 'name') {
      result.sort((a, b) => {
        let aValue = a.name.toLowerCase();
        let bValue = b.name.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [recipes, searchTerm, sortConfig]);

  const handleSort = (key: keyof Recipe) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Recipe }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-1 w-3 h-3 inline text-zinc-300" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-1 w-3 h-3 inline text-black" />
      : <ArrowDown className="ml-1 w-3 h-3 inline text-black" />;
  };

  // Which recipe rows are expanded (view mode)
  const [expandedUuids, setExpandedUuids] = useState<Set<string>>(new Set());

  // Modal state: null = closed, "add" = new recipe, Recipe = edit that recipe
  const [modalMode, setModalMode] = useState<null | "add" | Recipe>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formInstructions, setFormInstructions] = useState("");
  const [formIngredients, setFormIngredients] = useState<IngredientRow[]>([]);

  useEffect(() => {
    if (canView) {
      fetchRecipes();
      fetchInventory();
    } else if (!isLoadingPermissions) {
      setIsLoading(false);
    }
  }, [canView, isLoadingPermissions]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchRecipes = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/recipes/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load recipes");
      setRecipes(await res.json());
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/inventory/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load inventory");
      const data = await res.json();
      setInventoryItems(data);
      setFilteredItems(data);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openAdd = () => {
    setFormName("");
    setFormInstructions("");
    setFormIngredients([]);
    setFilteredItems(inventoryItems);
    setModalMode("add");
  };

  const openEdit = (recipe: Recipe) => {
    setFormName(recipe.name);
    setFormInstructions(recipe.instructions);
    setFormIngredients(
      recipe.ingredients.map((ing) => ({
        id: ing.uuid,
        inventory_uuid: ing.inventory_uuid,
        inventory_name: ing.inventory_name,
        unit_measurement: ing.unit_measurement,
        quantity: String(ing.quantity),
        popoverOpen: false,
      }))
    );
    setFilteredItems(inventoryItems);
    setModalMode(recipe);
  };

  const closeModal = () => {
    setModalMode(null);
    setFormName("");
    setFormInstructions("");
    setFormIngredients([]);
  };

  // ── Ingredient row helpers ────────────────────────────────────────────────

  const addRow = () =>
    setFormIngredients((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        inventory_uuid: "",
        inventory_name: "Select an ingredient",
        unit_measurement: "",
        quantity: "1",
        popoverOpen: false,
      },
    ]);

  const removeRow = (id: string) =>
    setFormIngredients((prev) => prev.filter((r) => r.id !== id));

  const updateRow = (id: string, patch: Partial<IngredientRow>) =>
    setFormIngredients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );

  const handleSearch = (query: string) => {
    if (!query) { setFilteredItems(inventoryItems); return; }
    setFilteredItems(
      inventoryItems.filter((i) =>
        i.name.toLowerCase().includes(query.toLowerCase())
      )
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) { toast.error("Recipe name is required"); return; }
    for (const row of formIngredients) {
      if (!row.inventory_uuid) {
        toast.error("Please select an ingredient for every row.");
        return;
      }
      if (!row.quantity || parseFloat(row.quantity) <= 0) {
        toast.error(`Quantity for "${row.inventory_name}" must be > 0`);
        return;
      }
    }

    const isEdit = modalMode !== "add" && modalMode !== null;
    const editUuid = isEdit ? (modalMode as Recipe).uuid : null;

    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const url = editUuid
        ? `${API_BASE_URL}/recipes/${editUuid}`
        : `${API_BASE_URL}/recipes/`;
      const method = editUuid ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formName.trim(),
          instructions: formInstructions,
          ingredients: formIngredients.map((r) => ({
            inventory_uuid: r.inventory_uuid,
            quantity: parseFloat(r.quantity),
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save recipe");
      }

      toast.success(editUuid ? "Recipe updated" : "Recipe created");
      closeModal();
      fetchRecipes();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (uuid: string, name: string) => {
    if (!confirm(`Delete recipe "${name}"? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/recipes/${uuid}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete recipe");
      toast.success("Recipe deleted");
      fetchRecipes();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Toggle expand (View) ──────────────────────────────────────────────────

  const toggleExpand = (uuid: string) =>
    setExpandedUuids((prev) => {
      const next = new Set(prev);
      next.has(uuid) ? next.delete(uuid) : next.add(uuid);
      return next;
    });

  // ── Ingredient rows UI (inside modal) ────────────────────────────────────

  const renderIngredientRows = () => (
    <div className="bg-white border rounded-md overflow-hidden">
      <div className="grid grid-cols-[1fr_120px_130px_36px] gap-3 px-4 py-2 bg-zinc-50 border-b text-xs font-medium text-zinc-500 uppercase tracking-wide">
        <span>Ingredient</span>
        <span>Unit</span>
        <span>Quantity</span>
        <span />
      </div>
      {formIngredients.length === 0 ? (
        <div className="px-4 py-5 text-center text-muted-foreground italic text-sm">
          No ingredients yet. Click "Add Ingredient".
        </div>
      ) : (
        <div className="divide-y">
          {formIngredients.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[1fr_120px_130px_36px] gap-3 px-4 py-3 items-center"
            >
              <Popover
                open={row.popoverOpen}
                onOpenChange={(open) => {
                  updateRow(row.id, { popoverOpen: open });
                  if (open) setFilteredItems(inventoryItems);
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal h-9"
                  >
                    <span
                      className={
                        row.inventory_uuid
                          ? "text-zinc-800"
                          : "text-zinc-400 text-sm"
                      }
                    >
                      {row.inventory_name}
                    </span>
                    <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search inventory..."
                      onValueChange={handleSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No items found.</CommandEmpty>
                      <CommandGroup>
                        {filteredItems.map((item) => (
                          <CommandItem
                            key={item.uuid}
                            value={item.uuid}
                            onSelect={() =>
                              updateRow(row.id, {
                                inventory_uuid: item.uuid,
                                inventory_name: item.name,
                                unit_measurement: item.unit_measurement,
                                popoverOpen: false,
                              })
                            }
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                row.inventory_uuid === item.uuid
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {item.name}
                            <span className="ml-auto text-zinc-400 text-xs">
                              {item.unit_measurement}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Input
                readOnly
                value={row.unit_measurement}
                placeholder="unit"
                className="h-9 bg-zinc-50 text-zinc-500 cursor-default"
              />
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={row.quantity}
                onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                className="h-9"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-red-600"
                onClick={() => removeRow(row.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isLoadingPermissions && !canView) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900 mb-1">Access Restricted</h2>
        <p className="text-sm text-zinc-500">You do not have permission to view recipes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-3">
          <div>
            <h1 className="text-3xl font-light tracking-tight">Recipes</h1>
            <p className="text-muted-foreground mt-1">
              Manage your bakery recipes and their ingredients.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <Button
              onClick={openAdd}
              className="bg-black text-white hover:bg-zinc-800 shrink-0 mt-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Recipe
            </Button>
          )}
          </div>
        </div>
        <div className="relative w-full sm:w-72 mt-2 sm:mt-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input 
            placeholder="Search recipes..." 
            className="pl-9 h-9 w-full bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Recipe list */}
      <div className="bg-white rounded-md border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50">
              <TableHead className="font-medium cursor-pointer hover:bg-zinc-100" onClick={() => handleSort('name')}>Name <SortIcon columnKey="name" /></TableHead>
              <TableHead className="font-medium">Ingredients</TableHead>
              <TableHead className="text-right font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-10 text-muted-foreground italic"
                >
                  Loading recipes...
                </TableCell>
              </TableRow>
            ) : filteredAndSortedRecipes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center py-10 text-muted-foreground italic"
                >
                  No recipes yet. Click "Add Recipe" to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedRecipes.map((recipe) => {
                const expanded = expandedUuids.has(recipe.uuid);
                return (
                  <>
                    <TableRow
                      key={recipe.uuid}
                      className="hover:bg-zinc-50/50 transition-colors"
                    >
                      <TableCell className="font-medium">{recipe.name}</TableCell>
                      <TableCell className="text-zinc-500">
                        {recipe.ingredients.length} ingredient
                        {recipe.ingredients.length !== 1 ? "s" : ""}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* View */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-500 hover:text-blue-600"
                            title="View"
                            onClick={() => toggleExpand(recipe.uuid)}
                          >
                            {expanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          {/* Edit */}
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-500 hover:text-black"
                              title="Edit"
                              onClick={() => openEdit(recipe)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Delete */}
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-500 hover:text-red-600"
                              title="Delete"
                              onClick={() => handleDelete(recipe.uuid, recipe.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Inline expanded view */}
                    {expanded && (
                      <TableRow key={`${recipe.uuid}-expanded`} className="bg-zinc-50/40">
                        <TableCell colSpan={3} className="px-6 py-4">
                          <div className="space-y-3">
                            {recipe.ingredients.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                                  Ingredients
                                </p>
                                <div className="divide-y border rounded-md bg-white overflow-hidden">
                                  {recipe.ingredients.map((ing) => (
                                    <div
                                      key={ing.uuid}
                                      className="flex items-center justify-between px-3 py-2 text-sm"
                                    >
                                      <span>{ing.inventory_name}</span>
                                      <span className="text-zinc-500">
                                        {ing.quantity}{" "}
                                        <span className="text-zinc-400">
                                          {ing.unit_measurement}
                                        </span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {recipe.instructions && (
                              <div>
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
                                  Instructions
                                </p>
                                <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                                  {recipe.instructions}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Add / Edit Modal ── */}
      <Dialog open={modalMode !== null} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modalMode === "add" ? "Add New Recipe" : "Edit Recipe"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-1">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="recipe-name">
                Recipe Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="recipe-name"
                placeholder='e.g. "Yummy Bread"'
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={isSaving}
              />
            </div>

            {/* Ingredients */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Ingredients</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  className="h-7 gap-1 text-xs"
                >
                  <Plus className="w-3 h-3" /> Add Ingredient
                </Button>
              </div>
              {renderIngredientRows()}
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label htmlFor="recipe-instructions">Instructions</Label>
              <Textarea
                id="recipe-instructions"
                placeholder="Describe preparation steps..."
                value={formInstructions}
                onChange={(e) => setFormInstructions(e.target.value)}
                disabled={isSaving}
                className="min-h-[100px] resize-y"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-black text-white hover:bg-zinc-800"
              >
                {isSaving
                  ? "Saving..."
                  : modalMode === "add"
                  ? "Save Recipe"
                  : "Update Recipe"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
