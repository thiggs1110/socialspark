import { useAuth } from "@/hooks/useAuth";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminStatus();

  if (authLoading || adminLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. You must be an administrator to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-amber-50 dark:bg-amber-950 border-l-4 border-amber-400 p-4 mb-6">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-amber-600 mr-2" />
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <strong>Admin Mode:</strong> You have administrative privileges. Use these tools responsibly.
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}