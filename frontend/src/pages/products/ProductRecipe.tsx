import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ArrowLeft, Plus, Trash2, ChevronsUpDown, Check, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { API_BASE_URL } from "@/config/constants";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";

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

export default function ProductRecipe() {
  const { uuid: productUuid } = useParams<{ uuid: string }>();

  const [productName, setProductName] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state — null means "create new", string = editing that recipe uuid
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formInstructions, setFormInstructions] = useState("");
  const [formIngredients, setFormIngredients] = useState<IngredientRow[]>([]);

  // Which recipe rows are expanded in the list
  const [expandedUuids, setExpandedUuids] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRecipes();
    fetchInventory();
  }, [productUuid]);

  const fetchRecipes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${productUuid}/recipes`);
      if (!res.ok) throw new Error("Failed to load recipes");
      const data = await res.json();
      setProductName(data.product_name);
      setRecipes(data.recipes);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/`);
      if (!res.ok) throw new Error("Failed to load inventory");
      const data = await res.json();
      setInventoryItems(data);
      setFilteredItems(data);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ── Ingredient row helpers ──────────────────────────────────────
  const addRow = () =>
    setFormIngredients((prev) => [
      ...prev,
      { id: crypto.randomUUID(), inventory_uuid: "", inventory_name: "Select an ingredient", unit_measurement: "", quantity: "1", popoverOpen: false },
    ]);

  const removeRow = (id: string) =>
    setFormIngredients((prev) => prev.filter((r) => r.id !== id));

  const updateRow = (id: string, patch: Partial<IngredientRow>) =>
    setFormIngredients((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleSearch = (query: string) => {
    if (!query) { setFilteredItems(inventoryItems); return; }
    setFilteredItems(inventoryItems.filter((i) => i.name.toLowerCase().includes(query.toLowerCase())));
  };

  // ── Form reset ──────────────────────────────────────────────────
  const resetForm = () => {
    setEditingUuid(null);
    setFormName("");
    setFormInstructions("");
    setFormIngredients([]);
  };

  const startEdit = (recipe: Recipe) => {
    setEditingUuid(recipe.uuid);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) { toast.error("Recipe name is required"); return; }
    for (const row of formIngredients) {
      if (!row.inventory_uuid) { toast.error("Please select an ingredient for every row."); return; }
      if (!row.quantity || parseFloat(row.quantity) <= 0) { toast.error(`Quantity for "${row.inventory_name}" must be > 0`); return; }
    }

    setIsSaving(true);
    try {
      const url = editingUuid
        ? `${API_BASE_URL}/products/${productUuid}/recipes/${editingUuid}`
        : `${API_BASE_URL}/products/${productUuid}/recipes`;
      const method = editingUuid ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
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

      toast.success(editingUuid ? "Recipe updated" : "Recipe created");
      resetForm();
      fetchRecipes();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────
  const handleDelete = async (recipeUuid: string) => {
    if (!confirm("Delete this recipe? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/products/${productUuid}/recipes/${recipeUuid}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete recipe");
      toast.success("Recipe deleted");
      if (editingUuid === recipeUuid) resetForm();
      fetchRecipes();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleExpand = (uuid: string) =>
    setExpandedUuids((prev) => {
      const next = new Set(prev);
      next.has(uuid) ? next.delete(uuid) : next.add(uuid);
      return next;
    });

  // ── Ingredient rows UI (shared for form) ────────────────────────
  const renderIngredientRows = () => (
    <div className="bg-white border rounded-md overflow-hidden">
      <div className="grid grid-cols-[1fr_130px_150px_36px] gap-3 px-4 py-2 bg-zinc-50 border-b text-xs font-medium text-zinc-500 uppercase tracking-wide">
        <span>Ingredient</span>
        <span>Unit</span>
        <span>Quantity</span>
        <span />
      </div>
      {formIngredients.length === 0 ? (
        <div className="px-4 py-6 text-center text-muted-foreground italic text-sm">
          No ingredients yet. Click "Add Ingredient".
        </div>
      ) : (
        <div className="divide-y">
          {formIngredients.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_130px_150px_36px] gap-3 px-4 py-3 items-center">
              <Popover open={row.popoverOpen} onOpenChange={(open) => { updateRow(row.id, { popoverOpen: open }); if (open) setFilteredItems(inventoryItems); }}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-9">
                    <span className={row.inventory_uuid ? "text-zinc-800" : "text-zinc-400 text-sm"}>{row.inventory_name}</span>
                    <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search inventory..." onValueChange={handleSearch} />
                    <CommandList>
                      <CommandEmpty>No items found.</CommandEmpty>
                      <CommandGroup>
                        {filteredItems.map((item) => (
                          <CommandItem key={item.uuid} value={item.uuid} onSelect={() => updateRow(row.id, { inventory_uuid: item.uuid, inventory_name: item.name, unit_measurement: item.unit_measurement, popoverOpen: false })}>
                            <Check className={cn("mr-2 h-4 w-4", row.inventory_uuid === item.uuid ? "opacity-100" : "opacity-0")} />
                            {item.name}
                            <span className="ml-auto text-zinc-400 text-xs">{item.unit_measurement}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Input readOnly value={row.unit_measurement} placeholder="unit" className="h-9 bg-zinc-50 text-zinc-500 cursor-default" />
              <Input type="number" step="0.01" min="0.01" value={row.quantity} onChange={(e) => updateRow(row.id, { quantity: e.target.value })} className="h-9" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600" onClick={() => removeRow(row.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link to="/products" className="text-muted-foreground hover:text-black transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-3xl font-light tracking-tight">Recipes</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Managing recipes for <span className="font-medium text-zinc-700">{productName}</span>.
        </p>
      </div>

      {/* ── Create / Edit form ── */}
      <div className="bg-white border rounded-md p-6 space-y-5">
        <h2 className="text-base font-semibold">
          {editingUuid ? `Editing: ${formName}` : "New Recipe"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Recipe name */}
          <div className="space-y-2">
            <Label htmlFor="recipe-name">Recipe Name <span className="text-red-500">*</span></Label>
            <Input
              id="recipe-name"
              placeholder='e.g. "Gluten-Free Version"'
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* Ingredients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Ingredients</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRow} className="h-7 gap-1 text-xs">
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
              className="min-h-[130px] resize-y"
            />
          </div>

          <div className="flex justify-end gap-2">
            {editingUuid && (
              <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving}>
                Cancel Edit
              </Button>
            )}
            <Button type="submit" disabled={isSaving} className="bg-black text-white hover:bg-zinc-800">
              {isSaving ? "Saving..." : editingUuid ? "Update Recipe" : "Save Recipe"}
            </Button>
          </div>
        </form>
      </div>

      {/* ── Existing recipes list ── */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Existing Recipes</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground italic">Loading...</p>
        ) : recipes.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No recipes yet. Use the form above to create one.</p>
        ) : (
          <div className="space-y-2">
            {recipes.map((recipe) => {
              const expanded = expandedUuids.has(recipe.uuid);
              return (
                <div key={recipe.uuid} className="bg-white border rounded-md overflow-hidden">
                  {/* Row header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-left flex-1"
                      onClick={() => toggleExpand(recipe.uuid)}
                    >
                      {expanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                      <span className="font-medium text-zinc-800">{recipe.name}</span>
                      <span className="text-xs text-zinc-400 ml-2">
                        {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? "s" : ""}
                      </span>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-black" onClick={() => startEdit(recipe)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-600" onClick={() => handleDelete(recipe.uuid)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expanded && (
                    <div className="border-t px-4 py-4 space-y-4 bg-zinc-50/50">
                      {recipe.ingredients.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Ingredients</p>
                          <div className="divide-y border rounded-md bg-white overflow-hidden">
                            {recipe.ingredients.map((ing) => (
                              <div key={ing.uuid} className="flex items-center justify-between px-3 py-2 text-sm">
                                <span>{ing.inventory_name}</span>
                                <span className="text-zinc-500">{ing.quantity} <span className="text-zinc-400">{ing.unit_measurement}</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {recipe.instructions && (
                        <div>
                          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Instructions</p>
                          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{recipe.instructions}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
