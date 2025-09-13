import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { format } from "date-fns";
import type { Content } from "@shared/schema";

const platformIcons: Record<string, string> = {
  facebook: "📘",
  instagram: "📷", 
  linkedin: "💼",
  twitter: "🐦",
  pinterest: "📌",
};

const contentTypeColors: Record<string, string> = {
  educational: "bg-secondary/10 text-secondary",
  promotional: "bg-accent/10 text-accent",
  community: "bg-primary/10 text-primary",
  humorous: "bg-yellow-100 text-yellow-700",
};

export default function RecentContent() {
  const { toast } = useToast();

  const { data: content, isLoading, error } = useQuery<Content[]>({
    queryKey: ["/api/content"],
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
      <Card className="border-border bg-card" data-testid="recent-content-card">
        <CardHeader>
          <CardTitle className="text-xl">Recent Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start space-x-4 p-4 bg-muted/30 rounded-lg animate-pulse">
                <div className="w-12 h-12 bg-muted rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentContent = content?.slice(0, 5) || [];

  return (
    <Card className="border-border bg-card" data-testid="recent-content-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Recent Content</CardTitle>
          <Button 
            variant="ghost" 
            className="text-sm text-primary hover:text-primary/80 font-medium"
            data-testid="button-view-all-content"
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recentContent.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No content generated yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Use the content generation form to create your first posts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentContent.map((post) => (
              <div 
                key={post.id}
                className={`flex items-start space-x-4 p-4 rounded-lg ${
                  post.status === 'pending_approval' 
                    ? 'bg-yellow-50 border border-yellow-200' 
                    : 'bg-muted/30'
                }`}
                data-testid={`content-item-${post.id}`}
              >
                {post.imageUrl && (
                  <img 
                    src={post.imageUrl} 
                    alt="Post preview" 
                    className="w-12 h-12 rounded-lg object-cover"
                    data-testid={`content-image-${post.id}`}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge 
                      className={`text-xs font-medium rounded ${
                        contentTypeColors[post.contentType] || 'bg-muted text-muted-foreground'
                      }`}
                      data-testid={`content-type-badge-${post.id}`}
                    >
                      {post.contentType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {post.createdAt ? format(new Date(post.createdAt), 'h:mm a') : 'Just now'}
                    </span>
                  </div>
                  <p className="text-sm text-foreground font-medium line-clamp-2 mb-2">
                    {post.title || post.content?.slice(0, 100) + '...'}
                  </p>
                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-muted-foreground">
                      {platformIcons[post.platform]} {post.platform}
                    </span>
                    <span className={`text-xs font-medium ${
                      post.status === 'published' 
                        ? 'text-secondary' 
                        : post.status === 'pending_approval'
                        ? 'text-yellow-600'
                        : 'text-muted-foreground'
                    }`}>
                      {post.status === 'published' && '✓ Published'}
                      {post.status === 'pending_approval' && '⏳ Pending Approval'}
                      {post.status === 'draft' && '📝 Draft'}
                      {post.status === 'rejected' && '❌ Rejected'}
                      {post.status === 'failed' && '⚠️ Failed'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
