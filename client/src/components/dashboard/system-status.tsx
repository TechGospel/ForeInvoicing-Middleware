import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface SystemStatusProps {
  status?: {
    firsApi: string;
    database: string;
    redisQueue: string;
    validationService: string;
  };
}

export function SystemStatus({ status }: SystemStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
      case "healthy":
      case "online":
        return "bg-green-100 text-green-800";
      case "high_load":
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "degraded":
      case "error":
      case "offline":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "operational": return "Operational";
      case "healthy": return "Healthy";
      case "online": return "Online";
      case "high_load": return "High Load";
      case "warning": return "Warning";
      case "degraded": return "Degraded";
      case "error": return "Error";
      case "offline": return "Offline";
      default: return status;
    }
  };

  const systemServices = [
    { name: "FIRS MBS API", status: status?.firsApi || "operational" },
    { name: "Database Connection", status: status?.database || "healthy" },
    { name: "Redis Queue", status: status?.redisQueue || "high_load" },
    { name: "Validation Service", status: status?.validationService || "online" },
  ];

  const apiUsage = [
    { endpoint: "POST /api/invoices", calls: 1247, progress: 85, color: "bg-primary" },
    { endpoint: "GET /api/invoices/{id}", calls: 892, progress: 60, color: "bg-green-500" },
    { endpoint: "GET /api/audit-logs", calls: 234, progress: 20, color: "bg-blue-500" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {systemServices.map((service) => (
            <div key={service.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  service.status === "operational" || service.status === "healthy" || service.status === "online"
                    ? "bg-green-500"
                    : service.status === "high_load" || service.status === "warning"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`} />
                <span className="text-foreground">{service.name}</span>
              </div>
              <Badge className={getStatusColor(service.status)}>
                {getStatusText(service.status)}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Usage (24h)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiUsage.map((api) => (
            <div key={api.endpoint} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm">{api.endpoint}</span>
                <span className="text-sm font-medium">{api.calls.toLocaleString()} calls</span>
              </div>
              <Progress value={api.progress} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
