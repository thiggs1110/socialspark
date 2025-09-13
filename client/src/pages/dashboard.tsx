import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsCards from "@/components/dashboard/stats-cards";
import ContentGeneration from "@/components/dashboard/content-generation";
import RecentContent from "@/components/dashboard/recent-content";
import ContentApproval from "@/components/dashboard/content-approval";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MessageSquare, 
  Calendar, 
  BarChart, 
  Settings 
} from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Content Dashboard"
          subtitle="Generate and manage your social media content"
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats Cards */}
          <StatsCards />

          {/* Content Generation Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <ContentGeneration />
            <RecentContent />
          </div>

          {/* Content Approval Section */}
          <ContentApproval />

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer" data-testid="quick-action-inbox">
              <CardContent className="flex items-center justify-center p-4">
                <div className="text-center">
                  <MessageSquare className="w-8 h-8 text-primary mx-auto mb-2" />
                  <span className="text-sm font-medium text-foreground">Check Inbox</span>
                  <span className="text-xs text-muted-foreground block">3 new messages</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer" data-testid="quick-action-schedule">
              <CardContent className="flex items-center justify-center p-4">
                <div className="text-center">
                  <Calendar className="w-8 h-8 text-secondary mx-auto mb-2" />
                  <span className="text-sm font-medium text-foreground">View Schedule</span>
                  <span className="text-xs text-muted-foreground block">24 posts queued</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer" data-testid="quick-action-analytics">
              <CardContent className="flex items-center justify-center p-4">
                <div className="text-center">
                  <BarChart className="w-8 h-8 text-accent mx-auto mb-2" />
                  <span className="text-sm font-medium text-foreground">Analytics</span>
                  <span className="text-xs text-muted-foreground block">Weekly report</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer" data-testid="quick-action-settings">
              <CardContent className="flex items-center justify-center p-4">
                <div className="text-center">
                  <Settings className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <span className="text-sm font-medium text-foreground">Settings</span>
                  <span className="text-xs text-muted-foreground block">Manage platforms</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
