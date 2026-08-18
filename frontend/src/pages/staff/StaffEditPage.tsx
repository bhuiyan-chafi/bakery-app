import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Info } from "lucide-react";
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
import { API_BASE_URL } from "@/config/constants";
import { toast } from "react-toastify";
import { usePermissions } from "@/hooks/usePermissions";

interface StaffInfo {
  uuid: string;
  username: string;
  name: string;
  phone: string;
  address: string;
  status: string;
}

interface OtherInfo {
  uuid: string;
  field_title: string;
  field_value: string;
  created_at: string | null;
}

export default function StaffEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission, isLoading: isLoadingPermissions } = usePermissions();
  const canEditStaff = hasPermission("staff:edit");

  // Basic info state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [username, setUsername] = useState("");

  // Other info state
  const [fieldTitle, setFieldTitle] = useState("");
  const [fieldValue, setFieldValue] = useState("");
  const [isAddingInfo, setIsAddingInfo] = useState(false);
  const [otherInfoList, setOtherInfoList] = useState<OtherInfo[]>([]);
  const [isLoadingOtherInfo, setIsLoadingOtherInfo] = useState(true);

  const token = localStorage.getItem("token");

  const fetchUser = async () => {
    try {
      setIsLoadingUser(true);
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load staff member");
      const data: StaffInfo = await res.json();
      setUsername(data.username);
      setName(data.name || "");
      setPhone(data.phone || "");
      setAddress(data.address || "");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const fetchOtherInfo = async () => {
    try {
      setIsLoadingOtherInfo(true);
      const res = await fetch(`${API_BASE_URL}/users/${id}/other-info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load additional information");
      const data = await res.json();
      setOtherInfoList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoadingOtherInfo(false);
    }
  };

  useEffect(() => {
    if (canEditStaff && id) {
      fetchUser();
      fetchOtherInfo();
    } else if (!isLoadingPermissions) {
      setIsLoadingUser(false);
      setIsLoadingOtherInfo(false);
    }
  }, [canEditStaff, isLoadingPermissions, id]);

  const handleSaveBasicInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phone, address }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update staff member");
      }
      toast.success("Staff information updated successfully");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOtherInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldTitle.trim() || !fieldValue.trim()) {
      toast.error("Both Field Title and Field Value are required");
      return;
    }
    setIsAddingInfo(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}/other-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ field_title: fieldTitle.trim(), field_value: fieldValue.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add information");
      }
      toast.success("Information added successfully");
      setFieldTitle("");
      setFieldValue("");
      fetchOtherInfo();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAddingInfo(false);
    }
  };

  const handleDeleteOtherInfo = async (infoUuid: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}/other-info/${infoUuid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete entry");
      }
      toast.success("Entry deleted");
      fetchOtherInfo();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!isLoadingPermissions && !canEditStaff) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900 mb-1">Access Restricted</h2>
        <p className="text-sm text-zinc-500">You do not have permission to edit staff.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Page Header ─────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/staff")}
          className="text-zinc-400 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-light tracking-tight">Edit Staff</h1>
          {username && (
            <p className="text-muted-foreground mt-0.5 text-sm">@{username}</p>
          )}
        </div>
      </div>

      {/* ── Two-column section ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT: Basic Information */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-5 border-b bg-zinc-50/50">
            <h2 className="font-semibold text-zinc-900">Basic Information</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Update name, phone and address</p>
          </div>

          <form onSubmit={handleSaveBasicInfo} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="staff-name">Name</Label>
              <Input
                id="staff-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                disabled={isLoadingUser}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input
                id="staff-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 xxx xxxx xxx"
                disabled={isLoadingUser}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staff-address">Address</Label>
              <Textarea
                id="staff-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, City, State"
                rows={3}
                disabled={isLoadingUser}
              />
            </div>

            <Button
              type="submit"
              disabled={isSaving || isLoadingUser}
              className="w-full bg-black text-white hover:bg-zinc-800 gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </div>

        {/* RIGHT: Additional Information */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-5 border-b bg-zinc-50/50">
            <h2 className="font-semibold text-zinc-900">Additional Information</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Add custom key–value fields for this staff member</p>
          </div>

          <form onSubmit={handleAddOtherInfo} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="field-title">Field Title</Label>
              <Input
                id="field-title"
                value={fieldTitle}
                onChange={(e) => setFieldTitle(e.target.value)}
                placeholder="IBAN"
                disabled={isAddingInfo}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="field-value">Field Value</Label>
              <Input
                id="field-value"
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                placeholder="NG-xxx-xxxx-xxxx"
                disabled={isAddingInfo}
              />
            </div>

            <Button
              type="submit"
              disabled={isAddingInfo}
              variant="outline"
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              {isAddingInfo ? "Adding..." : "Add Entry"}
            </Button>
          </form>
        </div>
      </div>

      {/* ── Additional Info Table ─────────────── */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-zinc-50/50 flex items-center gap-2">
          <Info className="w-4 h-4 text-zinc-400" />
          <h2 className="font-semibold text-zinc-900">All Additional Information</h2>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/50">
              <TableHead className="font-medium">Field Title</TableHead>
              <TableHead className="font-medium">Field Value</TableHead>
              <TableHead className="text-right font-medium">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingOtherInfo ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">
                  Loading...
                </TableCell>
              </TableRow>
            ) : otherInfoList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">
                  No additional information added yet.
                </TableCell>
              </TableRow>
            ) : (
              otherInfoList.map((item) => (
                <TableRow key={item.uuid} className="hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="font-medium text-zinc-800">{item.field_title}</TableCell>
                  <TableCell className="text-zinc-600">{item.field_value}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-red-600"
                      onClick={() => handleDeleteOtherInfo(item.uuid)}
                      title="Delete entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
