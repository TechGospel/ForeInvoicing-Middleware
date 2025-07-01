import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DollarSign, BarChart3, Send, FileText, Users, Settings, Book, ClipboardList } from "lucide-react";
import { Link, useLocation } from "wouter";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Submit Invoice", href: "/submit-invoice", icon: Send },
  { name: "Invoice History", href: "/invoice-history", icon: FileText },
  { name: "Tenant Management", href: "/tenants", icon: Users },
  { name: "Configuration", href: "/config", icon: Settings },
  { name: "API Documentation", href: "/docs", icon: Book },
  { name: "Audit Logs", href: "/audit-logs", icon: ClipboardList },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="bg-white w-64 shadow-sm border-r border-gray-200 fixed h-full">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <DollarSign className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">FIRS MBS</h1>
            <p className="text-sm text-gray-500">Invoice Middleware</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-primary text-primary-foreground"
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </Button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
