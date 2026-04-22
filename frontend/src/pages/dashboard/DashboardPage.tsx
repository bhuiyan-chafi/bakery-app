import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBasket, Users, DollarSign, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    { label: "Total Revenue", value: "$12,845", icon: DollarSign, trend: "+12%" },
    { label: "Active Orders", value: "24", icon: ShoppingBasket, trend: "+5%" },
    { label: "Customers", value: "1,204", icon: Users, trend: "+18%" },
    { label: "Sales Growth", value: "+24%", icon: TrendingUp, trend: "+2%" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-2">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="w-4 h-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{stat.value}</div>
              <p className="text-xs text-green-600 mt-1">
                {stat.trend} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder for charts/recent activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="h-64 border-none shadow-sm flex items-center justify-center text-muted-foreground italic">
          Recent Activity Chart Placeholder
        </Card>
        <Card className="h-64 border-none shadow-sm flex items-center justify-center text-muted-foreground italic">
          Popular Items Placeholder
        </Card>
      </div>
    </div>
  );
}
