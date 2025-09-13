import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  Heart, 
  Globe, 
  Clock,
  TrendingUp
} from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  weeklyPosts: number;
  engagementRate: number;
  activePlatforms: number;
  pendingApprovals: number;
}

export default function StatsCards() {
  const { toast } = useToast();

  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    retry: false,
  });

  if (error) {
    if (isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return null;
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border bg-card">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-3 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = stats || {
    weeklyPosts: 0,
    engagementRate: 0,
    activePlatforms: 0,
    pendingApprovals: 0,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="border-border bg-card" data-testid="stat-card-weekly-posts">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Posts This Week</p>
              <p className="text-2xl font-bold text-foreground" data-testid="stat-weekly-posts">
                {statsData.weeklyPosts}
              </p>
            </div>
            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            <TrendingUp className="w-3 h-3 text-secondary mr-1" />
            <span className="text-sm text-secondary font-medium">+12%</span>
            <span className="text-sm text-muted-foreground ml-1">from last week</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card" data-testid="stat-card-engagement">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Engagement Rate</p>
              <p className="text-2xl font-bold text-foreground" data-testid="stat-engagement-rate">
                {statsData.engagementRate}%
              </p>
            </div>
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-accent" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            <TrendingUp className="w-3 h-3 text-secondary mr-1" />
            <span className="text-sm text-secondary font-medium">+3.1%</span>
            <span className="text-sm text-muted-foreground ml-1">from last month</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card" data-testid="stat-card-platforms">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Platforms Active</p>
              <p className="text-2xl font-bold text-foreground" data-testid="stat-active-platforms">
                {statsData.activePlatforms}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-muted-foreground">Facebook, Instagram, LinkedIn +3</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card" data-testid="stat-card-pending">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
              <p className="text-2xl font-bold text-foreground" data-testid="stat-pending-approvals">
                {statsData.pendingApprovals}
              </p>
            </div>
            <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-destructive font-medium">
              {statsData.pendingApprovals > 0 ? "Needs attention" : "All caught up"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
