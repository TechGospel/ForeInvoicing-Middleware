import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuthContext } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import Dashboard from "@/pages/dashboard";
import SubmitInvoice from "@/pages/submit-invoice";
import InvoiceHistory from "@/pages/invoice-history";
import AuditLogs from "@/pages/audit-logs";
import TenantManagement from "@/pages/tenant-management";
import Configuration from "@/pages/configuration";
import ApiDocs from "@/pages/api-docs";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuthContext();

  // Show login/register pages for unauthenticated users
  if (!isAuthenticated && !isLoading) {
    return (
      <Switch>
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route path="/" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  // Show main app for authenticated users
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="FIRS MBS API" subtitle="Invoice Processing System" />
        <main className="flex-1 overflow-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/submit-invoice" component={SubmitInvoice} />
            <Route path="/invoice-history" component={InvoiceHistory} />
            <Route path="/audit-logs" component={AuditLogs} />
            <Route path="/tenant-management" component={TenantManagement} />
            <Route path="/configuration" component={Configuration} />
            <Route path="/api-docs" component={ApiDocs} />
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
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
