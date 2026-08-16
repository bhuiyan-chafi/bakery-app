import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User as UserIcon, Shield } from "lucide-react";
import { toast } from "react-toastify";
import { API_BASE_URL } from "@/config/constants";
import { useNavigate } from "react-router-dom";

interface UserProfileFormProps {
  userId: string; // "me" or a UUID
  onUpdate?: () => void;
}

export default function UserProfileForm({ userId, onUpdate }: UserProfileFormProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [permissions, setPermissions] = useState<{ permission_uuid: string; name: string }[]>([]);

  const isMe = userId === "me";

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
           if (isMe) {
               navigate('/login');
               return;
           }
           throw new Error("No authorization token found");
        }

        const endpoint = isMe ? `${API_BASE_URL}/auth/me` : `${API_BASE_URL}/users/${userId}`;
        const res = await fetch(endpoint, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          if (res.status === 401 && isMe) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            toast.error("Session expired. Please log in again.");
            navigate('/login');
            return;
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.msg || errData.error || "Failed to load profile");
        }
        
        const data = await res.json();
        setUsername(data.username);
        setStatus(data.status);
        setName(data.name || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");

        // Fetch assigned permissions
        const permEndpoint = isMe ? `${API_BASE_URL}/auth/me/permissions` : `${API_BASE_URL}/users/${userId}/permissions`;
        const permRes = await fetch(permEndpoint, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (permRes.ok) {
          const permData: { permission_uuid: string; name: string; active: boolean }[] = await permRes.json();
          setPermissions(permData.filter(p => p.active));
        }
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId, isMe, navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Username cannot be empty");
      return;
    }
    
    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload: any = { 
        username: username.trim(),
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim()
      };
      if (password) {
        payload.password = password;
      }

      // If not editing "me", we allow status editing
      if (!isMe) {
        payload.status = status;
      }

      const endpoint = isMe ? `${API_BASE_URL}/auth/me` : `${API_BASE_URL}/users/${userId}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      const data = await res.json();
      toast.success(isMe ? "Profile updated successfully" : "User updated successfully");
      
      if (isMe) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      setPassword("");
      setConfirmPassword("");
      
      if (onUpdate) onUpdate();
      
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b bg-zinc-50/50 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-500">
          <UserIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-zinc-900">{isMe ? "User Profile" : "Edit User"}</h2>
          <p className="text-xs text-zinc-500">{isMe ? "Update your account details and password" : "Update user details and status"}</p>
        </div>
      </div>
      
      <div className="p-5 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="py-8 text-center text-zinc-400 italic">Loading profile...</div>
        ) : (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`username-${userId}`}>Username</Label>
              <Input 
                id={`username-${userId}`} 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                placeholder="Enter username"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`name-${userId}`}>Full Name</Label>
              <Input 
                id={`name-${userId}`} 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Enter full name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor={`phone-${userId}`}>Phone</Label>
                <Input 
                  id={`phone-${userId}`} 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`address-${userId}`}>Address</Label>
                <Input 
                  id={`address-${userId}`} 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  placeholder="Address details"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label>Status</Label>
              {!isMe ? (
                 <select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
                </select>
              ) : (
                <div className="h-9 px-3 flex items-center rounded-md border bg-zinc-50 text-sm text-zinc-500 capitalize cursor-not-allowed">
                  {status || "Unknown"}
                </div>
              )}
            </div>

            {/* Permissions summary */}
            <div className="pt-4 mt-4 border-t">
              <div className="flex items-center gap-2 mb-2.5">
                <Shield className="w-4 h-4 text-zinc-500" />
                <h3 className="text-sm font-medium">{isMe ? "Your Permissions" : "Assigned Permissions"}</h3>
              </div>
              {permissions.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No active permissions assigned.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {permissions.map((perm) => (
                    <span
                      key={perm.permission_uuid}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200"
                    >
                      {perm.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t">
              <h3 className="text-sm font-medium mb-3">Change Password</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor={`password-${userId}`}>New Password</Label>
                  <Input 
                    id={`password-${userId}`} 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="Leave blank to keep current password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`confirm-password-${userId}`}>Confirm New Password</Label>
                  <Input 
                    id={`confirm-password-${userId}`} 
                    type="password" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={isSaving} className="bg-black hover:bg-zinc-800 text-white">
                {isSaving ? "Saving..." : (isMe ? "Update Profile" : "Update User")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
