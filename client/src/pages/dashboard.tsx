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

export default function Dashboard() {
  const { data: metrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: activity } = useQuery({
    queryKey: ["/api/dashboard/activity"],
  });

  const { data: systemStatus } = useQuery({
    queryKey: ["/api/system/status"],
  });

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* <Sidebar /> */}
      
      <div className="flex-1">
        <Header 
          title="Dashboard"
          subtitle="Monitor your FIRS MBS invoice integrations"
        />
        
        <main className="p-6 space-y-6">
          <MetricsCards metrics={metrics} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
        </main>
      </div>
    </div>
  );
}
