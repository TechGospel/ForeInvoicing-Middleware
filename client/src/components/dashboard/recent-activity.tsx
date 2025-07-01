import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface RecentActivityProps {
  activity?: Array<{
    id: number;
    invoiceId: string;
    tenant: string;
    amount: string;
    status: string;
    timestamp: string;
  }>;
}

export function RecentActivity({ activity }: RecentActivityProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "processing":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600";
      case "processing":
        return "text-blue-600";
      case "warning":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const mockActivity = [
    {
      id: 1,
      invoiceId: "INV-2024-001523",
      tenant: "Acme Corp Ltd",
      amount: "1,250,000.00",
      status: "success",
      statusText: "Successfully submitted to FIRS",
      timestamp: "2 minutes ago"
    },
    {
      id: 2,
      invoiceId: "INV-2024-001522", 
      tenant: "TechStart Nigeria",
      amount: "890,500.00",
      status: "processing",
      statusText: "Validating invoice format",
      timestamp: "5 minutes ago"
    },
    {
      id: 3,
      invoiceId: "INV-2024-001521",
      tenant: "Global Imports Ltd",
      amount: "2,100,750.00", 
      status: "warning",
      statusText: "Validation warning: Missing VAT details",
      timestamp: "12 minutes ago"
    }
  ];

  const displayActivity = activity || mockActivity;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Invoice Activity</CardTitle>
        <a href="#" className="text-primary hover:text-primary/80 text-sm font-medium">
          View All
        </a>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivity.map((item) => (
            <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-100 rounded-lg">
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                {getStatusIcon(item.status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{item.invoiceId}</p>
                  <span className="text-sm text-muted-foreground">{item.timestamp}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.tenant} - ₦{item.amount}
                </p>
                <p className={`text-xs ${getStatusColor(item.status)}`}>
                  {item.statusText}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
