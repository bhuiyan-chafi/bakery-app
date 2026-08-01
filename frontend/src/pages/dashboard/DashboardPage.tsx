import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBasket, PlayCircle, Clock, DollarSign, Wallet, Truck } from "lucide-react";
import { API_BASE_URL } from "@/config/constants";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const role = user?.role?.toUpperCase();
  const username = user?.username ?? "";

  const [activeProductions, setActiveProductions] = useState<number | null>(null);
  const [completedOrdersCount, setCompletedOrdersCount] = useState<number | null>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number | null>(null);
  const [totalSalesCount, setTotalSalesCount] = useState<number | null>(null);
  const [profit7Days, setProfit7Days] = useState<number | null>(null);
  
  const [isLoadingProd, setIsLoadingProd] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingProfit, setIsLoadingProfit] = useState(true);

  // Normal user stats
  const [myCompletedDeliveries, setMyCompletedDeliveries] = useState<number | null>(null);
  const [myPendingDeliveries, setMyPendingDeliveries] = useState<number | null>(null);
  const [isLoadingMyDeliveries, setIsLoadingMyDeliveries] = useState(true);

  useEffect(() => {
    if (role === "ADMIN" || role === "MANAGER" || role === "STAFF") {
      // Fetch Active Productions
      fetch(`${API_BASE_URL}/products/production/active`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch active productions");
          return res.json();
        })
        .then((data) => {
          setActiveProductions(data.count);
          setIsLoadingProd(false);
        })
        .catch((err) => {
          console.error(err);
          setIsLoadingProd(false);
        });
    }

    if (role === "ADMIN" || role === "MANAGER") {
      // Fetch Completed/Pending Orders Stats (Last 7 Days)
      fetch(`${API_BASE_URL}/orders/stats/7days`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch order stats");
          return res.json();
        })
        .then((data) => {
          setCompletedOrdersCount(data.completed_count);
          setPendingOrdersCount(data.pending_count);
          setTotalSalesCount(data.total_sales);
          setIsLoadingOrders(false);
        })
        .catch((err) => {
          console.error(err);
          setIsLoadingOrders(false);
        });

      // Fetch 7-Day Profit
      const today = new Date();
      const endDate = today.toISOString().split("T")[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split("T")[0];

      fetch(`${API_BASE_URL}/accounts/transactions?start_date=${startDate}&end_date=${endDate}&type=profit`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch profit stats");
          return res.json();
        })
        .then((data: any[]) => {
          const total = data.reduce((acc, t) => {
            return t.type === 'income' ? acc + t.amount : acc - t.amount;
          }, 0);
          setProfit7Days(total);
          setIsLoadingProfit(false);
        })
        .catch((err) => {
          console.error(err);
          setIsLoadingProfit(false);
        });
    }

    if (role === "NORMAL") {
      if (username) {
        fetch(`${API_BASE_URL}/orders/my-deliveries?username=${encodeURIComponent(username)}`)
          .then(res => {
            if (!res.ok) throw new Error("Failed to load my deliveries");
            return res.json();
          })
          .then((data: any[]) => {
            setMyCompletedDeliveries(data.filter(o => o.status === "complete").length);
            setMyPendingDeliveries(data.filter(o => o.status === "pending").length);
            setIsLoadingMyDeliveries(false);
          })
          .catch(err => {
            console.error(err);
            setIsLoadingMyDeliveries(false);
          });
      } else {
        setIsLoadingMyDeliveries(false);
      }
    }
  }, [role, username]);

  const adminStats = [
    {
      label: "Active Productions",
      value: isLoadingProd ? "..." : String(activeProductions ?? 0),
      icon: PlayCircle,
      trendText: "Currently running",
      isNeutralTrend: true,
    },
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
        : (totalSalesCount ?? 0).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          }),
      icon: DollarSign,
      trendText: "Last 7 days",
      isNeutralTrend: true,
    },
    {
      label: "Net Profit",
      value: isLoadingProfit
        ? "..."
        : (profit7Days! < 0 ? "-" : "") + "$" + Math.abs(profit7Days ?? 0).toFixed(2),
      icon: Wallet,
      trendText: "Last 7 days",
      isNeutralTrend: true,
      valueClassName: isLoadingProfit 
        ? "" 
        : ((profit7Days ?? 0) >= 0 ? "text-green-600" : "text-red-600"),
    }
  ];

  const staffStats = [
    {
      label: "Active Productions",
      value: isLoadingProd ? "..." : String(activeProductions ?? 0),
      icon: PlayCircle,
      trendText: "Currently running",
      isNeutralTrend: true,
    }
  ];

  const normalStats = [
    {
      label: "My Completed Deliveries",
      value: isLoadingMyDeliveries ? "..." : String(myCompletedDeliveries ?? 0),
      icon: Truck,
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

  let visibleStats: any[] = [];
  if (role === "ADMIN" || role === "MANAGER") {
    visibleStats = adminStats;
  } else if (role === "STAFF") {
    visibleStats = staffStats;
  } else if (role === "NORMAL") {
    visibleStats = normalStats;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-2">Welcome back, {username || "User"}! Here's what's happening today.</p>
      </div>

      {role === "NORMAL" && (
        <div className="bg-zinc-50 border rounded-xl p-6 mb-8">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-zinc-500" />
            My Delivery Stats
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {visibleStats.map((stat) => (
              <Card key={stat.label} className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
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

      {role !== "NORMAL" && (
        <>
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
            {visibleStats.map((stat) => (
              <Card key={stat.label} className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
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

          {/* Placeholder for charts/recent activity for privileged users */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="h-64 border-none shadow-sm flex items-center justify-center text-muted-foreground italic">
              Recent Activity Chart Placeholder
            </Card>
            <Card className="h-64 border-none shadow-sm flex items-center justify-center text-muted-foreground italic">
              Popular Items Placeholder
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
