import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Check, X, Edit, Loader2 } from "lucide-react";
import type { Content } from "@shared/schema";

const platformInfo: Record<string, { name: string; color: string; icon: string }> = {
  facebook: { name: "Facebook", color: "bg-blue-500", icon: "f" },
  instagram: { name: "Instagram", color: "bg-gradient-to-r from-purple-500 to-pink-500", icon: "📷" },
  linkedin: { name: "LinkedIn", color: "bg-blue-600", icon: "in" },
  twitter: { name: "Twitter", color: "bg-blue-400", icon: "𝕏" },
  pinterest: { name: "Pinterest", color: "bg-red-500", icon: "📌" },
};

const contentTypeColors: Record<string, string> = {
  educational: "bg-secondary/10 text-secondary",
  promotional: "bg-accent/10 text-accent",
  community: "bg-primary/10 text-primary",
  humorous: "bg-yellow-100 text-yellow-700",
};

export default function ContentApproval() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingContent, isLoading, error } = useQuery<Content[]>({
    queryKey: ["/api/content", { status: "pending" }],
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: async (contentId: string) => {
      return await apiRequest("PATCH", `/api/content/${contentId}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "Content Approved",
        description: "The content has been approved and scheduled for publishing.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Approval Failed",
        description: "Failed to approve content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (contentId: string) => {
      return await apiRequest("PATCH", `/api/content/${contentId}/reject`, {});
    },
    onSuccess: () => {
      toast({
        title: "Content Rejected",
        description: "The content has been rejected and removed from the queue.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Rejection Failed",
        description: "Failed to reject content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const approveAllMutation = useMutation({
    mutationFn: async () => {
      if (!pendingContent) return;
      
      const approvalPromises = pendingContent.map(content => 
        apiRequest("PATCH", `/api/content/${content.id}/approve`, {})
      );
      
      return await Promise.all(approvalPromises);
    },
    onSuccess: () => {
      toast({
        title: "All Content Approved",
        description: "All pending content has been approved and scheduled.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Bulk Approval Failed",
        description: "Failed to approve all content. Please try again.",
        variant: "destructive",
      });
    },
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
      <Card className="border-border bg-card" data-testid="content-approval-card">
        <CardHeader>
          <CardTitle className="text-xl">Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border border-border rounded-lg p-4 space-y-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pending = pendingContent || [];

  return (
    <Card className="border-border bg-card" data-testid="content-approval-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Pending Approvals</CardTitle>
          {pending.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => approveAllMutation.mutate()}
                disabled={approveAllMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-secondary hover:text-secondary/80 border border-secondary hover:bg-secondary/10 rounded-lg"
                data-testid="button-approve-all"
              >
                {approveAllMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  "Approve All"
                )}
              </Button>
              <Button
                variant="outline"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted rounded-lg"
                data-testid="button-edit-queue"
              >
                Edit Queue
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <div className="text-center py-12">
            <Check className="w-12 h-12 text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">
              No content awaiting approval. Generate new content to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {pending.map((post) => {
              const platform = platformInfo[post.platform] || { name: post.platform, color: "bg-gray-500", icon: "?" };
              
              return (
                <div 
                  key={post.id}
                  className="border border-border rounded-lg p-4 space-y-4"
                  data-testid={`pending-content-${post.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 ${platform.color} rounded flex items-center justify-center text-white text-xs font-bold`}>
                        {platform.icon}
                      </div>
                      <span className="text-sm font-medium text-foreground">{platform.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {post.scheduledFor 
                        ? format(new Date(post.scheduledFor), 'MMM d h:mm a')
                        : 'Not scheduled'
                      }
                    </span>
                  </div>

                  {post.imageUrl && (
                    <img 
                      src={post.imageUrl} 
                      alt="Generated content image" 
                      className="w-full h-32 object-cover rounded-lg"
                      data-testid={`content-image-${post.id}`}
                    />
                  )}

                  <div className="space-y-2">
                    <p className="text-sm text-foreground">
                      {post.content}
                    </p>
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.hashtags.map((tag, index) => (
                          <span 
                            key={index} 
                            className="text-xs text-primary"
                            data-testid={`hashtag-${post.id}-${index}`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Badge 
                      className={`text-xs font-medium rounded ${
                        contentTypeColors[post.contentType] || 'bg-muted text-muted-foreground'
                      }`}
                      data-testid={`content-type-${post.id}`}
                    >
                      {post.contentType}
                    </Badge>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => rejectMutation.mutate(post.id)}
                        disabled={rejectMutation.isPending || approveMutation.isPending}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
                        data-testid={`button-reject-${post.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                        data-testid={`button-edit-${post.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => approveMutation.mutate(post.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="p-2 text-secondary hover:bg-secondary/10 rounded-lg"
                        data-testid={`button-approve-${post.id}`}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
