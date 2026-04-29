import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Scale, Shield, Users, Pencil, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { API_BASE_URL } from "@/config/constants";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import UserProfileForm from "./components/UserProfileForm";
import UserPermissionsCard from "./components/UserPermissionsCard";

interface UserListItem {
  uuid: string;
  username: string;
  name: string;
  role: string;
  status: string;
}

export default function SettingsPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  
  const [editUserUuid, setEditUserUuid] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/users/`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err: any) {
      toast.error("Failed to load users");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditUser = (uuid: string) => {
    setEditUserUuid(uuid);
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = async (user: UserListItem) => {
    if (user.status === "active") {
      toast.error("Cannot delete an active user. Please edit the user and change their status to suspended or inactive first.");
      return;
    }

    if (!confirm(`Are you sure you want to soft delete ${user.username}? This will wipe their permissions and hide them.`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users/${user.uuid}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete user");
      }
      
      toast.success("User deleted successfully");
      fetchUsers(); // Refresh the list
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your application settings and configurations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link to="/settings/permissions" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Permissions Management
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link to="/settings/measurement-unit" className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Measurement Units
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <UserProfileForm userId="me" />
        <UserPermissionsCard userId="me" />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col mt-8">
        <div className="p-5 border-b bg-zinc-50/50 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-900">User Management</h2>
            <p className="text-xs text-zinc-500">Manage system users, roles, and access</p>
          </div>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50">
              <TableHead className="font-medium">Name</TableHead>
              <TableHead className="font-medium">Username</TableHead>
              <TableHead className="font-medium">Role</TableHead>
              <TableHead className="font-medium">Status</TableHead>
              <TableHead className="text-right font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingUsers ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.uuid} className="hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                  <TableCell className="text-zinc-500">{user.username}</TableCell>
                  <TableCell className="capitalize text-zinc-500">{user.role}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                      user.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                      user.status === 'suspended' ? 'bg-amber-100 text-amber-800' :
                      'bg-zinc-100 text-zinc-800'
                    }`}>
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-black"
                        onClick={() => handleEditUser(user.uuid)}
                        title="Edit User"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-red-600"
                        onClick={() => handleDeleteUser(user)}
                        title="Delete User"
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

      <Dialog open={isEditModalOpen} onOpenChange={(open) => {
        setIsEditModalOpen(open);
        if (!open) fetchUsers(); // Refresh list when modal closes
      }}>
        <DialogContent className="max-w-[1000px] w-full max-h-[90vh] overflow-y-auto p-0 border-none bg-transparent shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUserUuid && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#f2f2f2] p-6 rounded-xl">
              <UserProfileForm userId={editUserUuid} onUpdate={fetchUsers} />
              <UserPermissionsCard userId={editUserUuid} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
