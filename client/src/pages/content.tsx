import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarDays, Edit3, FileText, Hash, Image, MoreVertical, Search, Trash2, CheckCircle, XCircle, Send, Clock, Eye } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface Content {
  id: string;
  businessId: string;
  platform: string;
  contentType: string;
  status: string;
  title: string | null;
  content: string;
  hashtags: string[] | null;
  imageUrl: string | null;
  imagePrompt: string | null;
  scheduledFor: string | null;
  publishedAt: string | null;
  platformPostId: string | null;
  createdAt: string;
  updatedAt: string;
}

const platformInfo: Record<string, { name: string; color: string; icon: string }> = {
  facebook: { name: "Facebook", color: "bg-blue-500", icon: "f" },
  instagram: { name: "Instagram", color: "bg-gradient-to-r from-purple-500 to-pink-500", icon: "📷" },
  linkedin: { name: "LinkedIn", color: "bg-blue-600", icon: "in" },
  twitter: { name: "Twitter", color: "bg-blue-400", icon: "𝕏" },
  pinterest: { name: "Pinterest", color: "bg-red-500", icon: "📌" },
};

const statusInfo: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-gray-500", icon: FileText },
  pending_approval: { label: "Pending", color: "bg-yellow-500", icon: Clock },
  approved: { label: "Approved", color: "bg-green-500", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-500", icon: XCircle },
  published: { label: "Published", color: "bg-blue-500", icon: Send },
  failed: { label: "Failed", color: "bg-red-600", icon: XCircle },
};

const contentTypeInfo: Record<string, { label: string; color: string }> = {
  educational: { label: "Educational", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  promotional: { label: "Promotional", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  community: { label: "Community", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  humorous: { label: "Humorous", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  news: { label: "News", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  behind_scenes: { label: "Behind Scenes", color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200" },
};

export default function Content() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Redirect to login if not authenticated
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

  // Fetch content based on active tab
  const getQueryParams = () => {
    const params: Record<string, string> = { limit: "50" };
    if (activeTab === "pending") params.status = "pending";
    return new URLSearchParams(params).toString();
  };

  const { data: content = [], isLoading: isLoadingContent } = useQuery<Content[]>({
    queryKey: [`/api/content?${getQueryParams()}`],
    enabled: isAuthenticated,
  });

  // Filter content based on tab and search
  const filteredContent = content.filter((item) => {
    // Apply tab filter
    let matchesTab = false;
    switch (activeTab) {
      case "all":
        matchesTab = true;
        break;
      case "drafts":
        matchesTab = item.status === "draft";
        break;
      case "pending":
        matchesTab = item.status === "pending_approval";
        break;
      case "scheduled":
        matchesTab = item.status === "approved" && !!item.scheduledFor;
        break;
      case "published":
        matchesTab = item.status === "published";
        break;
      default:
        matchesTab = true;
    }

    // Apply search filter
    const matchesSearch = !searchTerm || 
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contentType.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  // Approve content mutation
  const approveMutation = useMutation({
    mutationFn: (contentId: string) => apiRequest('PATCH', `/api/content/${contentId}/approve`),
    onSuccess: () => {
      toast({ title: "Content approved successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/content'] });
    },
  });

  // Reject content mutation
  const rejectMutation = useMutation({
    mutationFn: (contentId: string) => apiRequest('PATCH', `/api/content/${contentId}/reject`),
    onSuccess: () => {
      toast({ title: "Content rejected" });
      queryClient.invalidateQueries({ queryKey: ['/api/content'] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading content...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Content Library"
          subtitle="Manage your generated content and drafts"
        />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Search and Filter Controls */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-content"
                />
              </div>
            </div>

            {/* Content Filter Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                <TabsTrigger value="drafts" data-testid="tab-drafts">Drafts</TabsTrigger>
                <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
                <TabsTrigger value="scheduled" data-testid="tab-scheduled">Scheduled</TabsTrigger>
                <TabsTrigger value="published" data-testid="tab-published">Published</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Content Grid */}
          {isLoadingContent ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-5/6"></div>
                      <div className="h-3 bg-muted rounded w-4/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No content found</h3>
              <p className="text-muted-foreground">
                {activeTab === "all" ? "Create your first content to get started." : `No ${activeTab} content available.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContent.map((item) => (
                <ContentCard 
                  key={item.id}
                  content={item}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onReject={(id) => rejectMutation.mutate(id)}
                  onEdit={(content) => {
                    setSelectedContent(content);
                    setEditDialogOpen(true);
                  }}
                  onDelete={(content) => {
                    setSelectedContent(content);
                    setDeleteDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}

          {/* Edit Dialog */}
          <EditContentDialog 
            content={selectedContent}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />

          {/* Delete Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Content</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this content? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-red-500 hover:bg-red-600"
                  data-testid="button-confirm-delete"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </div>
  );
}

// Content Card Component
function ContentCard({ 
  content, 
  onApprove, 
  onReject, 
  onEdit, 
  onDelete 
}: { 
  content: Content;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (content: Content) => void;
  onDelete: (content: Content) => void;
}) {
  const platform = platformInfo[content.platform] || { name: content.platform, color: "bg-gray-500", icon: "?" };
  const status = statusInfo[content.status] || statusInfo.draft;
  const contentType = contentTypeInfo[content.contentType] || contentTypeInfo.educational;
  const StatusIcon = status.icon;

  return (
    <Card className="border-border bg-card hover:bg-muted/50 transition-colors" data-testid={`card-content-${content.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2 flex-1">
            <div className={`w-6 h-6 rounded-full ${platform.color} flex items-center justify-center text-white text-xs font-bold`}>
              {platform.icon}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-medium text-foreground truncate">
                {content.title || "Untitled"}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className={`text-xs ${contentType.color}`}>
                  {contentType.label}
                </Badge>
                <Badge variant="outline" className={`text-xs text-white ${status.color}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {status.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {content.content}
        </p>
        
        {content.hashtags && content.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {content.hashtags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                <Hash className="w-2 h-2 mr-1" />
                {tag}
              </Badge>
            ))}
            {content.hashtags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{content.hashtags.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <span>{formatDistanceToNow(new Date(content.createdAt), { addSuffix: true })}</span>
          {content.scheduledFor && (
            <div className="flex items-center">
              <CalendarDays className="w-3 h-3 mr-1" />
              {format(new Date(content.scheduledFor), "MMM d, HH:mm")}
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          {content.status === "pending_approval" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onApprove(content.id)}
                className="flex-1"
                data-testid={`button-approve-${content.id}`}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(content.id)}
                className="flex-1"
                data-testid={`button-reject-${content.id}`}
              >
                <XCircle className="w-3 h-3 mr-1" />
                Reject
              </Button>
            </>
          )}
          
          {(content.status === "draft" || content.status === "approved") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(content)}
              className="flex-1"
              data-testid={`button-edit-${content.id}`}
            >
              <Edit3 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(content)}
            data-testid={`button-delete-${content.id}`}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Edit Content Dialog Component
function EditContentDialog({ 
  content, 
  open, 
  onOpenChange 
}: { 
  content: Content | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");

  useEffect(() => {
    if (content) {
      setEditedContent(content.content);
      setEditedTitle(content.title || "");
    }
  }, [content]);

  if (!content) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Content</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              placeholder="Content title..."
              data-testid="input-edit-title"
            />
          </div>
          
          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Content text..."
              rows={8}
              data-testid="textarea-edit-content"
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button data-testid="button-save-edit">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
