import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface MobileHeaderProps {
  onMenuClick: () => void;
  title: string;
  subtitle?: string;
}

export function MobileHeader({ onMenuClick, title, subtitle }: MobileHeaderProps) {
  return (
    <header className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <Button variant="ghost" size="sm" onClick={onMenuClick}>
        <Menu className="h-6 w-6" />
      </Button>
      <div className="flex-1 text-center">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && (
          <p className="text-xs text-gray-600 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      <div className="w-10" /> {/* Spacer for centering */}
    </header>
  );
}