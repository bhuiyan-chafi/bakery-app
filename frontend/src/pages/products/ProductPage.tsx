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
import { Plus, Pencil, Trash2, ListTree, ChevronsUpDown, Check, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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

interface Product {
  uuid: string;
  name: string;
  category_uuid: string;
  category_name: string;
  price: number;
  stock_threshold: number;
  current_stock: number;
}

interface Category {
  uuid: string;
  name: string;
}

export default function ProductPage() {
  const { hasPermission, hasAnyPermission, isLoading: isLoadingPermissions } = usePermissions();
  const canView = hasAnyPermission("product:view", "product:manage");
  const canManage = hasPermission("product:manage");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | 'total_amount', direction: 'asc' | 'desc' } | null>(null);

  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(p => 
        (p.name?.toLowerCase().includes(lowerSearch)) ||
        (p.category_name?.toLowerCase().includes(lowerSearch))
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any = sortConfig.key === 'total_amount' ? (a.price * (a.current_stock ?? 0)) : a[sortConfig.key as keyof Product];
        let bValue: any = sortConfig.key === 'total_amount' ? (b.price * (b.current_stock ?? 0)) : b[sortConfig.key as keyof Product];

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
  }, [products, searchTerm, sortConfig]);

  const handleSort = (key: keyof Product | 'total_amount') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Product | 'total_amount' }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-1 w-3 h-3 inline text-zinc-300" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="ml-1 w-3 h-3 inline text-black" />
      : <ArrowDown className="ml-1 w-3 h-3 inline text-black" />;
  };
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
  const [stockThreshold, setStockThreshold] = useState("0");

  useEffect(() => {
    if (canView) {
      fetchProducts();
      fetchCategories();
    } else if (!isLoadingPermissions) {
      setIsLoading(false);
    }
  }, [canView, isLoadingPermissions]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/products/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
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
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/products/categories`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
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
    setStockThreshold("0");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { toast.error("Product name is required"); return; }
    if (!selectedCategoryUuid) { toast.error("Please select a category"); return; }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const url = editUuid
        ? `${API_BASE_URL}/products/${editUuid}`
        : `${API_BASE_URL}/products/`;
      const method = editUuid ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          category_uuid: selectedCategoryUuid,
          price: parseFloat(price) || 0,
          stock_threshold: parseFloat(stockThreshold) || 0,
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
    setStockThreshold(String(p.stock_threshold ?? 0));
    setIsModalOpen(true);
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/products/${uuid}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
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

  if (!isLoadingPermissions && !canView) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900 mb-1">Access Restricted</h2>
        <p className="text-sm text-zinc-500">You do not have permission to view products.</p>
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
            <h1 className="text-3xl font-light tracking-tight">Products</h1>
            <p className="text-muted-foreground mt-1">Manage your bakery items, pricing, and stock.</p>
          </div>

          {/* Action buttons row */}
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link to="/products/categories" className="flex items-center gap-2">
                <ListTree className="w-4 h-4" />
                Product Categories
              </Link>
            </Button>

          {canManage && (
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
                      ₦
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

                <div className="space-y-2">
                  <Label htmlFor="product-threshold">Stock Alert Threshold</Label>
                  <p className="text-xs text-zinc-400">Show an alert when stock drops to or below this quantity. Set to 0 to disable.</p>
                  <Input
                    id="product-threshold"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="e.g. 10"
                    value={stockThreshold}
                    onChange={(e) => setStockThreshold(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting} className="bg-black text-white hover:bg-zinc-800">
                    {isSubmitting ? "Processing..." : (editUuid ? "Update Product" : "Save Product")}
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
            placeholder="Search products..." 
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
              <TableHead className="font-medium cursor-pointer hover:bg-zinc-100" onClick={() => handleSort('category_name')}>Category <SortIcon columnKey="category_name" /></TableHead>
              <TableHead className="font-medium cursor-pointer hover:bg-zinc-100" onClick={() => handleSort('price')}>Price <SortIcon columnKey="price" /></TableHead>
              <TableHead className="font-medium cursor-pointer hover:bg-zinc-100" onClick={() => handleSort('current_stock')}>Current Stock <SortIcon columnKey="current_stock" /></TableHead>
              <TableHead className="font-medium cursor-pointer hover:bg-zinc-100" onClick={() => handleSort('total_amount')}>Total Amount <SortIcon columnKey="total_amount" /></TableHead>
              {canManage && <TableHead className="text-right font-medium">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5} className="text-center py-10 text-muted-foreground italic">
                  Loading products...
                </TableCell>
              </TableRow>
            ) : filteredAndSortedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5} className="text-center py-10 text-muted-foreground italic">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedProducts.map((p) => (
                <TableRow key={p.uuid} className="hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-zinc-500">{p.category_name}</TableCell>
                  <TableCell className="text-zinc-500">₦ {p.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    {(() => {
                      const stock = p.current_stock ?? 0;
                      const threshold = p.stock_threshold ?? 0;
                      const isLow = threshold > 0 && stock <= threshold;
                      const isEmpty = stock === 0;
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isEmpty && threshold > 0
                            ? "bg-red-100 text-red-700"
                            : isLow
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {isLow && <span>⚠</span>}
                          {stock} units
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-zinc-500 font-medium">
                    ₦ {(p.price * (p.current_stock ?? 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
