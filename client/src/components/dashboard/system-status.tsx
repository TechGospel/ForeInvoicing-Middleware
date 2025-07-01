import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface SystemStatusProps {
  status?: {
    firsApi: string;
    database: string;
    redisQueue: string;
    validationService: string;
  };
}

export function SystemStatus({ status }: SystemStatusProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Fetch API usage statistics
  const { data: apiUsage, error: apiUsageError } = useQuery({
    queryKey: ["/api/usage/statistics"],
    enabled: isAuthenticated,
  });

  // Handle authentication errors
  useEffect(() => {
    if (apiUsageError && isUnauthorizedError(apiUsageError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [apiUsageError, toast]);

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

  // Use real API usage data or show loading/empty state
  const usageData = Array.isArray(apiUsage) ? apiUsage : [];

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
          {usageData.length > 0 ? usageData.map((api: any) => (
            <div key={api.endpoint} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-foreground text-sm">{api.endpoint}</span>
                <span className="text-sm font-medium">{api.calls.toLocaleString()} calls</span>
              </div>
              <Progress value={api.progress} className="h-2" />
            </div>
          )) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No API usage data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
