import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, ShoppingBasket, Package, ClipboardList, Settings } from "lucide-react";
import { APP_NAME } from "@/config/constants";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Products", icon: ShoppingBasket, path: "/products" },
  { label: "Inventory", icon: Package, path: "/inventory" },
  { label: "Orders", icon: ClipboardList, path: "/orders" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-60 border-r bg-[#18181b] text-white flex flex-col h-screen sticky top-0">
      <div className="p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-white p-1">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <span className="font-semibold text-lg tracking-tight">{APP_NAME}</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
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
}
