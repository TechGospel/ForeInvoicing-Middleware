import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MetricsCards } from "@/components/dashboard/metrics-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { SystemStatus } from "@/components/dashboard/system-status";
import { InvoiceForm } from "@/components/invoice/invoice-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, Code, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: metrics, error: metricsError } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    enabled: isAuthenticated,
  });

  const { data: activity, error: activityError } = useQuery({
    queryKey: ["/api/dashboard/activity"],
    enabled: isAuthenticated,
  });

  const { data: systemStatus, error: systemError } = useQuery({
    queryKey: ["/api/system/status"],
    enabled: isAuthenticated,
  });

  // Handle authentication errors
  useEffect(() => {
    const errors = [metricsError, activityError, systemError].filter(Boolean);
    for (const error of errors) {
      if (error && isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
    }
  }, [metricsError, activityError, systemError, toast]);

  if (authLoading) {
    return <div className="p-4 sm:p-6">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="p-4 sm:p-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please Log In
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need to be logged in to view the dashboard.
          </p>
          <Button onClick={() => window.location.href = "/login"}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Monitor your invoice processing performance
          </p>
        </div>
      </div>

      <MetricsCards metrics={metrics} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/submit-invoice">
                    <Button variant="outline" className="w-full justify-start h-auto p-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Submit New Invoice</p>
                        <p className="text-sm text-muted-foreground">Upload and validate B2B invoice</p>
                      </div>
                    </Button>
                  </Link>

                  <Link href="/audit-logs">
                    <Button variant="outline" className="w-full justify-start h-auto p-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <Search className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">View Audit Logs</p>
                        <p className="text-sm text-muted-foreground">Monitor system activity</p>
                      </div>
                    </Button>
                  </Link>

                  <Button variant="outline" className="w-full justify-start h-auto p-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Code className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Test API Endpoints</p>
                      <p className="text-sm text-muted-foreground">Interactive API testing</p>
                    </div>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <RecentActivity activity={activity} />
            </div>
          </div>

      {/* Invoice Submission Form */}
      <InvoiceForm />

      {/* System Status and API Usage */}
      <SystemStatus status={systemStatus} />
    </div>
  );
}
