import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, FileText, CheckCircle, Users, Clock } from "lucide-react";

interface MetricsCardsProps {
  metrics?: {
    totalInvoices: number;
    successRate: number;
    activeTenants: number;
    avgResponseTime: number;
    totalGrowth: number;
    successGrowth: number;
    tenantGrowth: number;
    responseImprovement: number;
  };
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards = [
    {
      title: "Total Invoices",
      value: metrics?.totalInvoices?.toLocaleString() || "0",
      change: `${metrics?.totalGrowth || 0}%`,
      changeLabel: "from last month",
      positive: (metrics?.totalGrowth || 0) > 0,
      icon: FileText,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      title: "Success Rate", 
      value: `${metrics?.successRate || 0}%`,
      change: `${metrics?.successGrowth || 0}%`,
      changeLabel: "from last month",
      positive: (metrics?.successGrowth || 0) > 0,
      icon: CheckCircle,
      iconBg: "bg-green-100",
      iconColor: "text-green-600"
    },
    {
      title: "Active Tenants",
      value: metrics?.activeTenants?.toString() || "0",
      change: `${metrics?.tenantGrowth || 0}%`,
      changeLabel: "from last month",
      positive: (metrics?.tenantGrowth || 0) > 0,
      icon: Users,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      title: "Avg Response Time",
      value: `${metrics?.avgResponseTime || 0}ms`,
      change: `${metrics?.responseImprovement || 0}ms`,
      changeLabel: "improvement",
      positive: (metrics?.responseImprovement || 0) > 0,
      icon: Clock,
      iconBg: "bg-yellow-100", 
      iconColor: "text-yellow-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold text-foreground">{card.value}</p>
                  <p className="text-sm mt-1 flex items-center">
                    {card.positive ? (
                      <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                    )}
                    <span className={card.positive ? "text-green-600" : "text-red-600"}>
                      {card.change}
                    </span>
                    <span className="text-muted-foreground ml-1">{card.changeLabel}</span>
                  </p>
                </div>
                <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
