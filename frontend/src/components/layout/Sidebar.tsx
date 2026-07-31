import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ShoppingBasket, Package, ClipboardList,
  Settings, Wallet, ShoppingBag, X, PanelLeftClose, Truck,
} from "lucide-react";
import { APP_NAME } from "@/config/constants";

const menuItems = [
  { label: "Dashboard",  icon: LayoutDashboard, path: "/dashboard",  restricted: false, normalOnly: false },
  { label: "Products",   icon: ShoppingBasket,  path: "/products",   restricted: true,  normalOnly: false },
  { label: "Inventory",  icon: Package,          path: "/inventory",  restricted: true,  normalOnly: false },
  { label: "Orders",     icon: ClipboardList,    path: "/orders",     restricted: true,  normalOnly: false },
  { label: "Accounts",   icon: Wallet,           path: "/accounts",   restricted: true,  normalOnly: false },
  { label: "Settings",   icon: Settings,         path: "/settings",   restricted: true,  normalOnly: false },
  { label: "Sale",       icon: ShoppingBag,      path: "/sale",       restricted: false, normalOnly: true  },
  { label: "My Orders",  icon: Truck,            path: "/my-orders",  restricted: false, normalOnly: true  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ mobileOpen, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.role?.toUpperCase();
  const status = user?.status?.toUpperCase();
  const isActive = status === "ACTIVE";           // full access
  const isApprovedOnly = status === "APPROVED";   // profile/dashboard only
  const isPrivileged = isActive && (role === "ADMIN" || role === "MANAGER");
  const isNormal = isActive && role === "NORMAL";

  const visibleMenuItems = menuItems.filter(item => {
    // Approved-only users: only see Dashboard (unrestricted, non-normalOnly items)
    if (isApprovedOnly) return !item.restricted && !item.normalOnly;
    if (item.normalOnly) return isNormal;
    if (item.restricted) return isPrivileged;
    return true;
  });

  const sidebarContent = (isMobile = false) => (
    <div
      className={cn(
        "bg-[#18181b] text-white flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden",
        isMobile ? "w-60" : collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Logo + collapse button */}
      <div className={cn("flex items-center p-4 min-h-[64px]", collapsed && !isMobile ? "justify-center" : "justify-between")}>
        <div className={cn("flex items-center gap-3 overflow-hidden", collapsed && !isMobile && "hidden")}>
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white p-0.5 shrink-0">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-semibold text-base tracking-tight whitespace-nowrap">{APP_NAME}</span>
        </div>

        {/* Collapsed: show just the logo */}
        {collapsed && !isMobile && (
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white p-0.5 shrink-0">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}

        {/* Mobile close / desktop collapse button */}
        {isMobile ? (
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          // Only show the collapse button when sidebar is expanded
          !collapsed && (
            <button
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              className="h-7 w-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {visibleMenuItems.map(item => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/dashboard" && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={isMobile ? onClose : undefined}
              title={collapsed && !isMobile ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-2.5 py-2.5 rounded-md transition-colors text-sm font-medium group",
                collapsed && !isMobile ? "justify-center" : "",
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              )}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-zinc-400")} />
              {(!collapsed || isMobile) && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Version badge + approved notice */}
      {(!collapsed || isMobile) && (
        <div className="p-3 border-t border-zinc-800 space-y-2">
          {isApprovedOnly && (
            <div className="bg-amber-900/40 border border-amber-700/50 rounded-lg px-3 py-2 text-xs text-amber-300 leading-relaxed">
              ⚠️ Your account is approved but not yet activated. Contact an admin to gain full access.
            </div>
          )}
          <div className="bg-zinc-900 rounded-lg p-2.5 text-xs text-zinc-500">
            v1.0.0 Stable
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col md:sticky md:top-0 md:h-screen md:border-r transition-all duration-300">
        {sidebarContent(false)}
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <div className="absolute inset-y-0 left-0 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
