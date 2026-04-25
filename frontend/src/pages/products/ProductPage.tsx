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
import { Plus, Pencil, Trash2, ListTree, ChevronsUpDown, Check, ChefHat, Factory } from "lucide-react";
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

interface Product {
  uuid: string;
  name: string;
  category_uuid: string;
  category_name: string;
  price: number;
}

interface Category {
  uuid: string;
  name: string;
}

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);

  // Form state
  const [editUuid, setEditUuid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selectedCategoryUuid, setSelectedCategoryUuid] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState("Select a category");
  const [price, setPrice] = useState("0");

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/`);
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      setProducts(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/categories`);
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      setCategories(data);
      setFilteredCategories(data);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCategorySearch = (query: string) => {
    if (!query) { setFilteredCategories(categories); return; }
    setFilteredCategories(categories.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase())
    ));
  };

  const resetForm = () => {
    setEditUuid(null);
    setName("");
    setSelectedCategoryUuid("");
    setSelectedCategoryName("Select a category");
    setPrice("0");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { toast.error("Product name is required"); return; }
    if (!selectedCategoryUuid) { toast.error("Please select a category"); return; }

    setIsSubmitting(true);
    try {
      const url = editUuid
        ? `${API_BASE_URL}/products/${editUuid}`
        : `${API_BASE_URL}/products/`;
      const method = editUuid ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category_uuid: selectedCategoryUuid,
          price: parseFloat(price) || 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Operation failed");
      }

      toast.success(editUuid ? "Product updated successfully" : "Product added successfully");
      setIsModalOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (p: Product) => {
    setEditUuid(p.uuid);
    setName(p.name);
    setSelectedCategoryUuid(p.category_uuid);
    setSelectedCategoryName(p.category_name);
    setPrice(String(p.price));
    setIsModalOpen(true);
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/products/${uuid}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete product");
      }
      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your bakery items, pricing, and stock.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link to="/products/categories" className="flex items-center gap-2">
              <ListTree className="w-4 h-4" />
              Product Categories
            </Link>
          </Button>

          <Dialog
            open={isModalOpen}
            onOpenChange={(open) => {
              setIsModalOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 bg-black text-white hover:bg-zinc-800">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editUuid ? "Edit Product" : "Add New Product"}</DialogTitle>
                <DialogDescription>
                  {editUuid ? "Update the product details." : "Add a new product to your bakery."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="product-name">Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="product-name"
                    placeholder="e.g. Sourdough Loaf"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2 flex flex-col">
                  <Label>Category <span className="text-red-500">*</span></Label>
                  <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                        disabled={isSubmitting}
                      >
                        {selectedCategoryName}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[375px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput placeholder="Search categories..." onValueChange={handleCategorySearch} />
                        <CommandList>
                          <CommandEmpty>No categories found.</CommandEmpty>
                          <CommandGroup>
                            {filteredCategories.map((cat) => (
                              <CommandItem
                                key={cat.uuid}
                                value={cat.uuid}
                                onSelect={() => {
                                  setSelectedCategoryUuid(cat.uuid);
                                  setSelectedCategoryName(cat.name);
                                  setIsCategoryPopoverOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selectedCategoryUuid === cat.uuid ? "opacity-100" : "opacity-0")} />
                                {cat.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-price">Price</Label>
                  <div className="flex items-center gap-0">
                    <span className="h-9 px-3 flex items-center border border-r-0 rounded-l-md bg-zinc-50 text-zinc-500 text-sm">
                      $
                    </span>
                    <Input
                      id="product-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={isSubmitting}
                      className="rounded-l-none"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting} className="bg-black text-white hover:bg-zinc-800">
                    {isSubmitting ? "Processing..." : (editUuid ? "Update Product" : "Save Product")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-md border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50">
              <TableHead className="font-medium">Name</TableHead>
              <TableHead className="font-medium">Category</TableHead>
              <TableHead className="font-medium">Price</TableHead>
              <TableHead className="text-right font-medium">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                  Loading products...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                  No products found. Click "Add Product" to get started.
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.uuid} className="hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-zinc-500">{p.category_name}</TableCell>
                  <TableCell className="text-zinc-500">${p.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-emerald-600"
                        title="Production"
                        asChild
                      >
                        <Link to={`/products/${p.uuid}/production`}>
                          <Factory className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-violet-600"
                        title="Recipe"
                        asChild
                      >
                        <Link to={`/products/${p.uuid}/recipe`}>
                          <ChefHat className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-black"
                        onClick={() => handleEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-red-600"
                        onClick={() => handleDelete(p.uuid)}
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
