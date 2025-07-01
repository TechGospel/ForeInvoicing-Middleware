import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import Dashboard from "@/pages/dashboard";
import SubmitInvoice from "@/pages/submit-invoice";
import InvoiceHistory from "@/pages/invoice-history";
import AuditLogs from "@/pages/audit-logs";
import TenantManagement from "@/pages/tenant-management-simple";
import Configuration from "@/pages/configuration";
import ApiDocs from "@/pages/api-docs";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

function Router() {
  // For demo purposes, always show the main app
  // Authentication can be implemented later
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <main className="flex-1 overflow-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/submit-invoice" component={SubmitInvoice} />
            <Route path="/invoice-history" component={InvoiceHistory} />
            <Route path="/audit-logs" component={AuditLogs} />
            <Route path="/tenant-management" component={TenantManagement} />
            <Route path="/configuration" component={Configuration} />
            <Route path="/api-docs" component={ApiDocs} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
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
