import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ShoppingBasket, Package, ClipboardList, Settings, Wallet, ShoppingBag, X } from "lucide-react";
import { APP_NAME } from "@/config/constants";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", restricted: false, normalOnly: false },
  { label: "Products", icon: ShoppingBasket, path: "/products", restricted: true, normalOnly: false },
  { label: "Inventory", icon: Package, path: "/inventory", restricted: true, normalOnly: false },
  { label: "Orders", icon: ClipboardList, path: "/orders", restricted: true, normalOnly: false },
  { label: "Accounts", icon: Wallet, path: "/accounts", restricted: true, normalOnly: false },
  { label: "Settings", icon: Settings, path: "/settings", restricted: true, normalOnly: false },
  { label: "Sale", icon: ShoppingBag, path: "/sale", restricted: false, normalOnly: true },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.role?.toUpperCase();
  const isPrivileged = role === 'ADMIN' || role === 'MANAGER';
  const isNormal = role === 'NORMAL';

  const visibleMenuItems = menuItems.filter(item => {
    if (item.normalOnly) return isNormal;
    if (item.restricted) return isPrivileged;
    return true;
  });

  const sidebarContent = (
    <div className="w-60 bg-[#18181b] text-white flex flex-col h-full">
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white p-1">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-semibold text-lg tracking-tight">{APP_NAME}</span>
        </div>
        {/* Close button — only visible on mobile */}
        <button
          onClick={onClose}
          className="md:hidden h-8 w-8 flex items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleMenuItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium",
                isActive 
                  ? "bg-zinc-800 text-white" 
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-zinc-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="bg-zinc-900 rounded-lg p-3 text-xs text-zinc-500">
          v1.0.0 Stable
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <div className="hidden md:flex md:flex-col md:sticky md:top-0 md:h-screen md:border-r">
        {sidebarContent}
      </div>

      {/* Mobile sidebar — slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 w-60 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
