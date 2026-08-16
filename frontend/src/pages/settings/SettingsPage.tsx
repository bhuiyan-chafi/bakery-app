import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Scale, Shield, Users, Pencil, Trash2, Download, Upload } from "lucide-react";
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
  status: string;
}

export default function SettingsPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [canManageUsers, setCanManageUsers] = useState(false);
  
  const [editUserUuid, setEditUserUuid] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Backup Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchMyPermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/auth/me/permissions`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const perms: { name: string; active: boolean }[] = await res.json();
        const hasUserManage = perms.some(p => p.name === 'user:manage' && p.active);
        setCanManageUsers(hasUserManage);
        if (hasUserManage) {
          fetchUsers();
        } else {
          setUsers([]);
          setIsLoadingUsers(false);
        }
      }
    } catch (err: any) {
      console.error("Failed to load permissions", err);
    }
  };

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
    fetchMyPermissions();
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
      <div>
        <h1 className="text-3xl font-light tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your application settings and configurations.</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-wrap items-center gap-3">
        {canManageUsers && (
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link to="/settings/permissions" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Permissions Management
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" size="sm" className="h-9">
          <Link to="/settings/measurement-unit" className="flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Measurement Units
          </Link>
        </Button>
        <div className="flex-1"></div>
        <Button variant="outline" size="sm" className="h-9 flex items-center gap-2" onClick={() => setIsUploadModalOpen(true)}>
          <Upload className="w-4 h-4" />
          Upload DB Backup
        </Button>
        <Button variant="default" size="sm" className="h-9 flex items-center gap-2" onClick={async () => {
          try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            toast.info("Generating backup...");
            const res = await fetch(`${API_BASE_URL}/settings/backup/download`, {
              headers: { "Authorization": `Bearer ${token}` }
            });
            
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || "Failed to download backup");
            }
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            // We try to extract filename from content-disposition header if possible
            const disposition = res.headers.get('content-disposition');
            let filename = `db_backup_${new Date().getTime()}.sql.gz`;
            if (disposition && disposition.includes('filename=')) {
                filename = disposition.split('filename=')[1].replace(/["']/g, '');
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast.success("Backup downloaded successfully");
          } catch (err: any) {
            toast.error(err.message);
          }
        }}>
          <Download className="w-4 h-4" />
          Download DB Backup
        </Button>
      </div>

      <div className="w-full">
        <UserProfileForm userId="me" />
      </div>

      {canManageUsers && (
        <>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col mt-8">
            <div className="p-5 border-b bg-zinc-50/50 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-900">User Management</h2>
                <p className="text-xs text-zinc-500">Manage system users and access</p>
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/50">
                  <TableHead className="font-medium">Name</TableHead>
                  <TableHead className="font-medium">Username</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="text-right font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingUsers ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.uuid} className="hover:bg-zinc-50/50 transition-colors">
                      <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                      <TableCell className="text-zinc-500">{user.username}</TableCell>
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
        </>
      )}

      {/* Upload Backup Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={(open) => {
        if (!isUploading) {
          setIsUploadModalOpen(open);
          setUploadFile(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Database Backup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm border border-amber-200">
              <strong>Warning:</strong> Uploading a backup will <strong>completely overwrite</strong> the current database. All current data will be lost. You will be logged out upon success.
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Backup File (.sql.gz)
              </label>
              <input
                type="file"
                accept=".sql.gz,.sql"
                className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setUploadFile(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button 
              disabled={!uploadFile || isUploading}
              onClick={async () => {
                if (!uploadFile) return;
                const token = localStorage.getItem('token');
                if (!token) return;
                
                setIsUploading(true);
                const formData = new FormData();
                formData.append('file', uploadFile);
                
                try {
                  const res = await fetch(`${API_BASE_URL}/settings/backup/upload`, {
                    method: 'POST',
                    headers: { "Authorization": `Bearer ${token}` },
                    body: formData,
                  });
                  
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Failed to restore backup");
                  
                  toast.success(data.message || "Database restored successfully.");
                  setIsUploadModalOpen(false);
                  
                  // Log out user
                  setTimeout(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/';
                  }, 1500);
                  
                } catch (err: any) {
                  toast.error(err.message);
                } finally {
                  setIsUploading(false);
                }
              }}
            >
              {isUploading ? "Restoring..." : "Restore Database"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
