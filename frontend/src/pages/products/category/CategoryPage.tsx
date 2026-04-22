import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Check, ChevronsUpDown, Pencil, Trash2 } from "lucide-react";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

interface Category {
  uuid: string;
  name: string;
  parent: string;
  status: string;
}

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [editUuid, setEditUuid] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [selectedParent, setSelectedParent] = useState("0");
  const [selectedParentName, setSelectedParentName] = useState("None (Root)");
  const [status, setStatus] = useState("active");
  const [searchResults, setSearchResults] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products/categories`);
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      setCategories(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchParents = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/products/categories/search/${query}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error("Search failed", error);
    }
  };

  const resetForm = () => {
    setEditUuid(null);
    setNewName("");
    setSelectedParent("0");
    setSelectedParentName("None (Root)");
    setStatus("active");
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) {
      toast.error("Category name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: newName,
        parent: selectedParent === "0" ? "0" : selectedParentName,
        status: status
      };

      const url = editUuid 
        ? `${API_BASE_URL}/products/categories/${editUuid}`
        : `${API_BASE_URL}/products/categories`;
      
      const method = editUuid ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Operation failed");
      }

      toast.success(editUuid ? "Category updated successfully" : "Category added successfully");
      setIsModalOpen(false);
      resetForm();
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditUuid(category.uuid);
    setNewName(category.name);
    setSelectedParent(category.parent);
    setSelectedParentName(getParentName(category.parent));
    setStatus(category.status);
    setIsModalOpen(true);
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/products/categories/${uuid}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete category");
      }

      toast.success("Category deleted successfully");
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Helper to find parent name from UUID
  const getParentName = (parentUuid: string) => {
    if (parentUuid === "0") return "None (Root)";
    const parent = categories.find(c => c.uuid === parentUuid);
    return parent ? parent.name : "Unknown Parent";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Product Categories</h1>
          <p className="text-muted-foreground mt-1">Manage your product grouping and hierarchy.</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-black text-white hover:bg-zinc-800">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editUuid ? "Edit Category" : "Add New Category"}</DialogTitle>
              <DialogDescription>
                {editUuid ? "Update the details of this category." : "Create a new product category."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name <span className="text-red-500">*</span></Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Pastries" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2 flex flex-col">
                <Label htmlFor="parent">Parent Category</Label>
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isPopoverOpen}
                      className="w-full justify-between font-normal text-left"
                      disabled={isSubmitting}
                    >
                      {selectedParentName}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[375px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search categories..." 
                        onValueChange={handleSearchParents}
                      />
                      <CommandList>
                        <CommandEmpty>No categories found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="0"
                            onSelect={() => {
                              setSelectedParent("0");
                              setSelectedParentName("None (Root)");
                              setIsPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedParent === "0" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            None (Root)
                          </CommandItem>
                          {searchResults.map((cat) => (
                            <CommandItem
                              key={cat.uuid}
                              value={cat.uuid}
                              onSelect={() => {
                                setSelectedParent(cat.uuid);
                                setSelectedParentName(cat.name);
                                setIsPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedParent === cat.uuid ? "opacity-100" : "opacity-0"
                                )}
                              />
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
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus} disabled={isSubmitting}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="bg-black text-white hover:bg-zinc-800">
                  {isSubmitting ? "Processing..." : (editUuid ? "Update Category" : "Save Category")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-md border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50">
              <TableHead className="font-medium">Category Name</TableHead>
              <TableHead className="font-medium">Parent</TableHead>
              <TableHead className="font-medium">Status</TableHead>
              <TableHead className="text-right font-medium">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                  Loading categories...
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                  No categories found.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.uuid} className="hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-zinc-500 italic">
                    {getParentName(category.parent)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={cn(
                        "capitalize px-2.5 py-0.5 border-none font-normal",
                        category.status === "active" 
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" 
                          : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                      )}
                    >
                      {category.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-zinc-500 hover:text-black"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-zinc-500 hover:text-red-600"
                        onClick={() => handleDelete(category.uuid)}
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
