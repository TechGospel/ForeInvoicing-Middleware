import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { useState } from "react";
import Dashboard from "@/pages/dashboard";
import SubmitInvoice from "@/pages/submit-invoice";
import InvoiceHistory from "@/pages/invoice-history";
import AuditLogs from "@/pages/audit-logs";
import TenantManagement from "@/pages/tenant-management-simple";
import TenantManagementFull from "@/pages/tenant-management-full";
import Configuration from "@/pages/configuration";
import ApiDocs from "@/pages/api-docs";
import ApiUsage from "@/pages/api-usage";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

function Router() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const handleOpenSidebar = () => {
    setSidebarOpen(true);
  };

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900">
      <Switch>
        {/* Auth pages without sidebar */}
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />

        {/* Main app with sidebar */}
        <Route>
          {() => (
            <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
              <Sidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />
              <div className="flex-1 flex flex-col overflow-hidden ">
                <MobileHeader
                  onMenuClick={handleOpenSidebar}
                  title="FIRS MBS API"
                  subtitle="Invoice Processing System"
                />
                <main className="flex-1 overflow-auto">
                  <Switch>
                    <Route path="/" component={Dashboard} />
                    <Route path="/submit-invoice" component={SubmitInvoice} />
                    <Route path="/invoice-history" component={InvoiceHistory} />
                    <Route path="/audit-logs" component={AuditLogs} />
                    <Route
                      path="/tenant-management"
                      component={TenantManagement}
                    />
                    <Route
                      path="/tenant-management-full"
                      component={TenantManagementFull}
                    />
                    <Route path="/configuration" component={Configuration} />
                    <Route path="/api-docs" component={ApiDocs} />
                    <Route path="/api-usage" component={ApiUsage} />
                    <Route component={NotFound} />
                  </Switch>
                </main>
              </div>
            </div>
          )}
        </Route>
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
