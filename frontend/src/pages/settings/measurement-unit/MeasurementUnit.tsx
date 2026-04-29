import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/config/constants";
import { toast } from "react-toastify";

interface UnitMeasurement {
  uuid: string;
  name: string;
  measurement: string;
}

export default function MeasurementUnit() {
  const [units, setUnits] = useState<UnitMeasurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [editUuid, setEditUuid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [measurement, setMeasurement] = useState("");

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/measurement-unit`);
      if (!response.ok) throw new Error("Failed to fetch measurement units");
      const data = await response.json();
      setUnits(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditUuid(null);
    setName("");
    setMeasurement("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !measurement) {
      toast.error("Both name and measurement fields are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editUuid
        ? `${API_BASE_URL}/settings/measurement-unit/${editUuid}`
        : `${API_BASE_URL}/settings/measurement-unit`;
      const method = editUuid ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, measurement }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Operation failed");
      }

      toast.success(editUuid ? "Unit updated successfully" : "Unit added successfully");
      setIsModalOpen(false);
      resetForm();
      fetchUnits();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (unit: UnitMeasurement) => {
    setEditUuid(unit.uuid);
    setName(unit.name);
    setMeasurement(unit.measurement);
    setIsModalOpen(true);
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm("Are you sure you want to delete this unit?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/settings/measurement-unit/${uuid}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete unit");
      }
      toast.success("Unit deleted successfully");
      fetchUnits();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/settings" className="text-muted-foreground hover:text-black transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-3xl font-light tracking-tight">Measurement Units</h1>
          </div>
          <p className="text-muted-foreground mt-1">Manage units of measurement for inventory and production.</p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-black text-white hover:bg-zinc-800">
              <Plus className="w-4 h-4 mr-2" />
              Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editUuid ? "Edit Unit" : "Add New Unit"}</DialogTitle>
              <DialogDescription>
                {editUuid ? "Update the details of this measurement unit." : "Create a new measurement unit."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="unit-name">Name <span className="text-red-500">*</span></Label>
                <Input
                  id="unit-name"
                  placeholder="e.g. Kilogram"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit-measurement">Measurement <span className="text-red-500">*</span></Label>
                <Input
                  id="unit-measurement"
                  placeholder="e.g. kg"
                  value={measurement}
                  onChange={(e) => setMeasurement(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="bg-black text-white hover:bg-zinc-800">
                  {isSubmitting ? "Processing..." : (editUuid ? "Update Unit" : "Save Unit")}
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
              <TableHead className="font-medium">Name</TableHead>
              <TableHead className="font-medium">Measurement</TableHead>
              <TableHead className="text-right font-medium">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">
                  Loading units...
                </TableCell>
              </TableRow>
            ) : units.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">
                  No measurement units found. Click "Add Unit" to get started.
                </TableCell>
              </TableRow>
            ) : (
              units.map((unit) => (
                <TableRow key={unit.uuid} className="hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="font-medium">{unit.name}</TableCell>
                  <TableCell className="text-zinc-500">{unit.measurement}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-black"
                        onClick={() => handleEdit(unit)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-red-600"
                        onClick={() => handleDelete(unit.uuid)}
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
