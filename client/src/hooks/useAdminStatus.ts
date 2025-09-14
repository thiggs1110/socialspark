import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface AdminStatusResponse {
  isAdmin: boolean;
  role: string | null;
  permissions: string[];
}

export function useAdminStatus() {
  const { user, isAuthenticated } = useAuth();

  const { data: adminStatus, isLoading } = useQuery<AdminStatusResponse>({
    queryKey: ['/api/admin/status'],
    enabled: isAuthenticated && !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    isAdmin: adminStatus?.isAdmin || false,
    adminRole: adminStatus?.role || null,
    permissions: adminStatus?.permissions || [],
    isLoading,
  };
}