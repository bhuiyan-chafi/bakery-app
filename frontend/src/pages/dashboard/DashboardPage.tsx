import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBasket, PlayCircle, Clock, Banknote, Wallet, Truck, PackageCheck, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "@/config/constants";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

export default function DashboardPage() {
  const { hasPermission, hasAnyPermission, isLoading: isLoadingPermissions } = usePermissions();
  const canViewProduction = hasAnyPermission("production:view", "production:manage");
  const canViewOrders = hasAnyPermission("order:view", "order:manage");
  const canViewAccounts = hasAnyPermission("account:view", "account:manage");
  const canViewMyDeliveries = hasPermission("sale:orders");

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const username = user?.username ?? "";
  const token = localStorage.getItem("token");

  const [activeProductions, setActiveProductions] = useState<number | null>(null);
  const [completedOrdersCount, setCompletedOrdersCount] = useState<number | null>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number | null>(null);
  const [totalSalesCount, setTotalSalesCount] = useState<number | null>(null);
  const [profit7Days, setProfit7Days] = useState<number | null>(null);
  
  const [isLoadingProd, setIsLoadingProd] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingProfit, setIsLoadingProfit] = useState(true);

  // Delivery stats
  const [myCompletedDeliveries, setMyCompletedDeliveries] = useState<number | null>(null);
  const [myPendingDeliveries, setMyPendingDeliveries] = useState<number | null>(null);
  const [isLoadingMyDeliveries, setIsLoadingMyDeliveries] = useState(true);

  useEffect(() => {
    if (!token) return;

    if (canViewProduction) {
      setIsLoadingProd(true);
      fetch(`${API_BASE_URL}/productions/active`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch active productions");
          return res.json();
        })
        .then((data) => {
          setActiveProductions(data.count ?? 0);
        })
        .catch((err) => {
          console.error("Active production fetch error:", err);
        })
        .finally(() => setIsLoadingProd(false));
    } else {
      setIsLoadingProd(false);
    }

    if (canViewOrders) {
      setIsLoadingOrders(true);
      fetch(`${API_BASE_URL}/orders/stats/7days`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch order stats");
          return res.json();
        })
        .then((data) => {
          setCompletedOrdersCount(data.completed_count ?? 0);
          setPendingOrdersCount(data.pending_count ?? 0);
          setTotalSalesCount(data.total_sales ?? 0);
        })
        .catch((err) => {
          console.error("Order stats fetch error:", err);
        })
        .finally(() => setIsLoadingOrders(false));
    } else {
      setIsLoadingOrders(false);
    }

    if (canViewAccounts) {
      setIsLoadingProfit(true);
      const today = new Date();
      const endDate = today.toISOString().split("T")[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split("T")[0];

      fetch(`${API_BASE_URL}/accounts/transactions?start_date=${startDate}&end_date=${endDate}&type=profit`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch profit stats");
          return res.json();
        })
        .then((data: any[]) => {
          if (Array.isArray(data)) {
            const total = data.reduce((acc, t) => {
              return t.type === 'income' ? acc + t.amount : acc - t.amount;
            }, 0);
            setProfit7Days(total);
          } else {
            setProfit7Days(0);
          }
        })
        .catch((err) => {
          console.error("Profit stats fetch error:", err);
        })
        .finally(() => setIsLoadingProfit(false));
    } else {
      setIsLoadingProfit(false);
    }

    if (canViewMyDeliveries && username) {
      setIsLoadingMyDeliveries(true);
      fetch(`${API_BASE_URL}/orders/my-deliveries?username=${encodeURIComponent(username)}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) throw new Error("Failed to load my deliveries");
          return res.json();
        })
        .then((data: any[]) => {
          if (Array.isArray(data)) {
            setMyCompletedDeliveries(data.filter(o => o.status === "complete").length);
            setMyPendingDeliveries(data.filter(o => o.status === "pending").length);
          }
        })
        .catch(err => {
          console.error("My deliveries fetch error:", err);
        })
        .finally(() => setIsLoadingMyDeliveries(false));
    } else {
      setIsLoadingMyDeliveries(false);
    }
  }, [token, canViewProduction, canViewOrders, canViewAccounts, canViewMyDeliveries, username]);

  // Construct general overview cards based on permissions
  const overviewStats: any[] = [];

  if (canViewProduction) {
    overviewStats.push({
      label: "Active Productions",
      value: isLoadingProd ? "..." : String(activeProductions ?? 0),
      icon: PlayCircle,
      trendText: "Currently running",
      isNeutralTrend: true,
    });
  }

  if (canViewOrders) {
    overviewStats.push(
      {
        label: "Completed Orders",
        value: isLoadingOrders ? "..." : String(completedOrdersCount ?? 0),
        icon: ShoppingBasket,
        trendText: "Last 7 days",
        isNeutralTrend: true,
      },
      {
        label: "Pending Orders",
        value: isLoadingOrders ? "..." : String(pendingOrdersCount ?? 0),
        icon: Clock,
        trendText: "Last 7 days",
        isNeutralTrend: true,
      },
      {
        label: "Total Sales",
        value: isLoadingOrders
          ? "..."
          : "₦" + (totalSalesCount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        icon: Banknote,
        trendText: "Last 7 days",
        isNeutralTrend: true,
      }
    );
  }

  if (canViewAccounts) {
    overviewStats.push({
      label: "Net Profit",
      value: isLoadingProfit
        ? "..."
        : (profit7Days! < 0 ? "-" : "") + "₦" + Math.abs(profit7Days ?? 0).toFixed(2),
      icon: Wallet,
      trendText: "Last 7 days",
      isNeutralTrend: true,
      valueClassName: isLoadingProfit 
        ? "" 
        : ((profit7Days ?? 0) >= 0 ? "text-green-600" : "text-red-600"),
    });
  }

  const deliveryStats = [
    {
      label: "My Completed Deliveries",
      value: isLoadingMyDeliveries ? "..." : String(myCompletedDeliveries ?? 0),
      icon: PackageCheck,
      trendText: "Total completed",
      isNeutralTrend: true,
      valueClassName: "text-emerald-600",
    },
    {
      label: "My Pending Deliveries",
      value: isLoadingMyDeliveries ? "..." : String(myPendingDeliveries ?? 0),
      icon: Clock,
      trendText: "Needs action",
      isNeutralTrend: true,
      valueClassName: "text-amber-600",
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-2">Welcome back, {username || "User"}! Here's what's happening today.</p>
      </div>

      {/* General overview stats */}
      {overviewStats.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {overviewStats.map((stat) => (
            <Card key={stat.label} className="border-none shadow-sm bg-white/70 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="w-4 h-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-semibold", stat.valueClassName)}>{stat.value}</div>
                <p className={cn(
                  "text-xs mt-1",
                  stat.isNeutralTrend ? "text-muted-foreground" : "text-green-600"
                )}>
                  {stat.trendText}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Driver / Sales Delivery stats */}
      {canViewMyDeliveries && (
        <div className="bg-zinc-50 border rounded-xl p-6">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-zinc-500" />
            My Delivery Stats
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {deliveryStats.map((stat) => (
              <Card key={stat.label} className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <stat.icon className="w-4 h-4 text-zinc-500" />
                </CardHeader>
                <CardContent>
                  <div className={cn("text-2xl font-semibold", stat.valueClassName)}>{stat.value}</div>
                  <p className={cn(
                    "text-xs mt-1",
                    stat.isNeutralTrend ? "text-muted-foreground" : "text-green-600"
                  )}>
                    {stat.trendText}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No stats available placeholder */}
      {!isLoadingPermissions && overviewStats.length === 0 && !canViewMyDeliveries && (
        <div className="p-8 text-center bg-white rounded-lg border shadow-sm">
          <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
          <h2 className="text-lg font-medium text-zinc-900 mb-1">Welcome to the Bakery App</h2>
          <p className="text-sm text-zinc-500">Use the sidebar to navigate through your permitted features.</p>
        </div>
      )}
    </div>
  );
}
