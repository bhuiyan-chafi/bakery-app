import React, { useState, useEffect } from "react";
import { Shield, Check, X } from "lucide-react";
import { toast } from "react-toastify";
import { API_BASE_URL } from "@/config/constants";

interface UserPermissionView {
  permission_uuid: string;
  name: string;
  active: boolean;
}

interface UserPermissionsCardProps {
  userId: string; // "me" or a UUID
}

export default function UserPermissionsCard({ userId }: UserPermissionsCardProps) {
  const [permissions, setPermissions] = useState<UserPermissionView[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isMe = userId === "me";

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const endpoint = isMe ? `${API_BASE_URL}/auth/me/permissions` : `${API_BASE_URL}/users/${userId}/permissions`;
        const res = await fetch(endpoint, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (res.ok) {
          const permData = await res.json();
          setPermissions(permData);
        }
      } catch (err: any) {
        toast.error("Failed to load permissions: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [userId, isMe]);

  const togglePermission = async (permUuid: string, currentActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = isMe 
        ? `${API_BASE_URL}/auth/me/permissions/${permUuid}` 
        : `${API_BASE_URL}/users/${userId}/permissions/${permUuid}`;

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ active: !currentActive })
      });
      if (!res.ok) throw new Error("Failed to update permission");
      
      setPermissions(prev => prev.map(p => 
        p.permission_uuid === permUuid ? { ...p, active: !currentActive } : p
      ));
      toast.success("Permission updated");
    } catch (err: any) {
      toast.error(err.message);
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
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b bg-zinc-50/50 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-zinc-900">{isMe ? "Your Permissions" : "User Permissions"}</h2>
          <p className="text-xs text-zinc-500">Toggle active permissions for this account</p>
        </div>
      </div>
      
      <div className="p-5 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="py-8 text-center text-zinc-400 italic">Loading permissions...</div>
        ) : permissions.length === 0 ? (
          <div className="py-8 text-center text-zinc-400 italic">No permissions available in the system.</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedPermissions)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([moduleName, perms]) => (
              <div key={moduleName} className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-900 capitalize border-b border-zinc-100 pb-2 mb-1">{moduleName} Permissions</h3>
                <div className="space-y-2">
                  {perms.map((perm) => (
                    <div key={perm.permission_uuid} className="flex items-center justify-between p-3 rounded-lg border bg-zinc-50/50">
                      <div>
                        <p className="text-sm font-medium font-mono text-zinc-800">{perm.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{perm.active ? "Active" : "Inactive"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePermission(perm.permission_uuid, perm.active)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 ${
                          perm.active ? 'bg-emerald-500' : 'bg-zinc-200'
                        }`}
                        role="switch"
                        aria-checked={perm.active}
                      >
                        <span className="sr-only">Toggle {perm.name}</span>
                        <span
                          className={`pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            perm.active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        >
                          <span
                            className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity ${
                              perm.active ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in'
                            }`}
                            aria-hidden="true"
                          >
                            <X className="h-3 w-3 text-zinc-400" />
                          </span>
                          <span
                            className={`absolute inset-0 flex h-full w-full items-center justify-center transition-opacity ${
                              perm.active ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out'
                            }`}
                            aria-hidden="true"
                          >
                            <Check className="h-3 w-3 text-emerald-600" />
                          </span>
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
