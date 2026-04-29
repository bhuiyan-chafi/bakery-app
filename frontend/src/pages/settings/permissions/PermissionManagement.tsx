import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Shield } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/config/constants";
import { toast } from "react-toastify";

interface Permission {
  uuid: string;
  name: string;
}

export default function PermissionManagement() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [editUuid, setEditUuid] = useState<string | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/permissions`);
      if (!response.ok) throw new Error("Failed to fetch permissions");
      const data = await response.json();
      setPermissions(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEditUuid(null);
    setName("");
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Permission name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editUuid 
        ? `${API_BASE_URL}/settings/permissions/${editUuid}`
        : `${API_BASE_URL}/settings/permissions`;
      const method = editUuid ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save permission");
      }

      toast.success(`Permission ${editUuid ? "updated" : "added"} successfully`);
      setIsModalOpen(false);
      resetForm();
      fetchPermissions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (perm: Permission) => {
    setEditUuid(perm.uuid);
    setName(perm.name);
    setIsModalOpen(true);
  };

  const handleDelete = async (uuid: string) => {
    if (!confirm("Are you sure you want to delete this permission?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/settings/permissions/${uuid}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete permission");
      }
      toast.success("Permission deleted successfully");
      fetchPermissions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const [moduleName] = perm.name.split(':');
    const group = moduleName || 'other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/settings" className="text-muted-foreground hover:text-black transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-3xl font-light tracking-tight">Permissions</h1>
          </div>
          <p className="text-muted-foreground mt-1">Manage system access permission tags (e.g., user:create).</p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-black text-white hover:bg-zinc-800">
              <Plus className="w-4 h-4 mr-2" />
              Add Permission
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editUuid ? "Edit Permission" : "Add New Permission"}</DialogTitle>
              <DialogDescription>
                {editUuid ? "Update the name of this permission tag." : "Create a new system-wide permission tag."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="perm-name">Permission Name <span className="text-red-500">*</span></Label>
                <Input
                  id="perm-name"
                  placeholder="e.g. order:create"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-zinc-500">
                  Must follow the 'module:action' standard formatting. No spaces allowed.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-black text-white hover:bg-zinc-800">
                  {isSubmitting ? "Saving..." : "Save Permission"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50">
              <TableHead className="w-[80px] font-medium">Icon</TableHead>
              <TableHead className="font-medium">Permission Tag</TableHead>
              <TableHead className="text-right font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">
                  Loading permissions...
                </TableCell>
              </TableRow>
            ) : permissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">
                  No permissions configured yet.
                </TableCell>
              </TableRow>
            ) : (
              Object.entries(groupedPermissions)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([moduleName, perms]) => (
                  <React.Fragment key={moduleName}>
                    <TableRow className="bg-zinc-100/50 hover:bg-zinc-100/50">
                      <TableCell colSpan={3} className="font-semibold text-zinc-900 capitalize py-2">
                        {moduleName} Permissions
                      </TableCell>
                    </TableRow>
                    {perms.map((perm) => (
                      <TableRow key={perm.uuid} className="hover:bg-zinc-50/50 transition-colors">
                        <TableCell>
                          <div className="h-8 w-8 bg-zinc-100 rounded-md flex items-center justify-center text-zinc-500">
                            <Shield className="w-4 h-4" />
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm pl-6">{perm.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-500 hover:text-black"
                              onClick={() => handleEdit(perm)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-500 hover:text-red-600"
                              onClick={() => handleDelete(perm.uuid)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
