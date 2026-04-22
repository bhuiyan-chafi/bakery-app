import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, ListTree } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProductPage() {
  return (
    <div className="space-y-6">
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
          <Button asChild size="sm" className="h-9 bg-black text-white hover:bg-zinc-800">
            <Link to="/products/add" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-md border shadow-sm">
        <Table>
          <TableCaption>A list of your products.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                No products found. Click "Add Product" to get started.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
