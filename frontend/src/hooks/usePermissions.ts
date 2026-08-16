import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config/constants";

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setPermissions([]);
        setIsLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/auth/me/permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: { permission_uuid: string; name: string; active: boolean }[] = await res.json();
        setPermissions(data.filter((p) => p.active).map((p) => p.name));
      }
    } catch (err) {
      console.error("Failed to load permissions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const hasPermission = (permission: string) => permissions.includes(permission);
  const hasAnyPermission = (...perms: string[]) => perms.some((p) => permissions.includes(p));

  return {
    permissions,
    isLoading,
    hasPermission,
    hasAnyPermission,
    refreshPermissions: fetchPermissions,
  };
}
