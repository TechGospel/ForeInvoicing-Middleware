import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DollarSign, BarChart3, Send, FileText, Users, Settings, Book, ClipboardList, LogOut, Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Submit Invoice", href: "/submit-invoice", icon: Send },
  { name: "Invoice History", href: "/invoice-history", icon: FileText },
  { name: "Tenant Management", href: "/tenant-management-full", icon: Users },
  { name: "Configuration", href: "/configuration", icon: Settings },
  { name: "API Documentation", href: "/api-docs", icon: Book },
  { name: "Audit Logs", href: "/audit-logs", icon: ClipboardList },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ isOpen = true, onClose, className }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    window.location.href = "/login";
  };

  const handleNavClick = () => {
    // Close mobile menu when nav item is clicked
    if (onClose) {
      onClose();
    }
  };

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter((item) => {
    // Hide tenant management for users with "user" role
    if (item.href === "/tenant-management-full" && user?.role === "user") {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 flex flex-col z-50",
        "fixed lg:static h-full w-64",
        "transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        className
      )}>
        {/* Mobile close button */}
        {onClose && (
          <div className="p-4 lg:hidden">
            <Button variant="ghost" size="sm" onClick={onClose} className="w-fit">
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}

        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <DollarSign className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">FIRS MBS</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Invoice Middleware</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 space-y-2 flex-1">
          {filteredNavigation.map((item) => {
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
                  onClick={handleNavClick}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );
}
