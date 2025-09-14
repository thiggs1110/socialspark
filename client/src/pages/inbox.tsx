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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Send, Sparkles, Eye, Clock, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Interaction {
  id: string;
  businessId: string;
  platform: string;
  interactionType: string;
  platformInteractionId: string;
  fromUser: string;
  fromUserDisplayName: string;
  fromUserProfilePic: string;
  message: string;
  contentId: string | null;
  isRead: boolean;
  isReplied: boolean;
  suggestedReply: string | null;
  actualReply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export default function Inbox() {
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [replyText, setReplyText] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Fetch interactions based on active tab
  const { data: interactions = [], isLoading: isLoadingInteractions } = useQuery<Interaction[]>({
    queryKey: [`/api/interactions${activeTab === 'unread' ? '?unreadOnly=true' : ''}`],
    enabled: isAuthenticated,
  });

  // Generate AI reply mutation
  const generateReplyMutation = useMutation({
    mutationFn: async (interactionId: string) => {
      const res = await apiRequest('POST', `/api/interactions/${interactionId}/generate-reply`);
      return await res.json();
    },
    onSuccess: (data, interactionId) => {
      setReplyText(data.suggestedReply);
      toast({
        title: "AI Reply Generated",
        description: "You can edit the suggested reply before sending.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate AI reply. Please try again.",
      });
    },
  });

  // Send reply mutation
  const replyMutation = useMutation({
    mutationFn: ({ interactionId, reply }: { interactionId: string; reply: string }) =>
      apiRequest('POST', `/api/interactions/${interactionId}/reply`, { reply }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/interactions') 
      });
      setReplyText("");
      setSelectedInteraction(null);
      toast({
        title: "Reply Sent",
        description: "Your reply has been sent successfully.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send reply. Please try again.",
      });
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (interactionId: string) => 
      apiRequest('POST', `/api/interactions/${interactionId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/interactions') 
      });
    },
  });

  const handleSelectInteraction = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setReplyText(interaction.actualReply || "");
    
    // Mark as read when selecting an unread interaction
    if (!interaction.isRead) {
      markAsReadMutation.mutate(interaction.id);
    }
  };

  const handleGenerateReply = () => {
    if (!selectedInteraction) return;
    generateReplyMutation.mutate(selectedInteraction.id);
  };

  const handleSendReply = () => {
    if (!selectedInteraction || !replyText.trim()) return;
    replyMutation.mutate({
      interactionId: selectedInteraction.id,
      reply: replyText.trim(),
    });
  };

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

  const unreadCount = interactions.filter((interaction: Interaction) => !interaction.isRead).length;

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return 'bg-blue-500';
      case 'instagram': return 'bg-pink-500';
      case 'linkedin': return 'bg-blue-700';
      case 'twitter': return 'bg-black';
      case 'pinterest': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getInteractionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'comment': return '💬';
      case 'dm': return '✉️';
      case 'mention': return '📢';
      default: return '💭';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading inbox...</p>
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
          title="Unified Inbox"
          subtitle="Manage all your social media interactions in one place with AI-powered reply suggestions"
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Interaction List */}
            <div className="lg:col-span-2">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Interactions
                      {unreadCount > 0 && (
                        <Badge variant="destructive" data-testid="unread-count">
                          {unreadCount}
                        </Badge>
                      )}
                    </CardTitle>
                    <Filter className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                      <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                      <TabsTrigger value="unread" data-testid="tab-unread">
                        Unread {unreadCount > 0 && `(${unreadCount})`}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                
                <CardContent className="p-0 flex-1 overflow-y-auto">
                  {isLoadingInteractions ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                      <p className="text-muted-foreground">Loading interactions...</p>
                    </div>
                  ) : interactions.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No interactions to display</p>
                      <p className="text-sm">
                        {activeTab === 'unread' 
                          ? "You're all caught up! No unread messages."
                          : "Your engagement inbox is empty."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {interactions.map((interaction: Interaction, index: number) => (
                        <div key={interaction.id}>
                          <div
                            className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                              selectedInteraction?.id === interaction.id ? 'bg-muted' : ''
                            } ${!interaction.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/30' : ''}`}
                            onClick={() => handleSelectInteraction(interaction)}
                            data-testid={`interaction-${interaction.id}`}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={interaction.fromUserProfilePic} />
                                <AvatarFallback>
                                  {interaction.fromUserDisplayName?.slice(0, 2).toUpperCase() || '??'}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium truncate">
                                    {interaction.fromUserDisplayName || interaction.fromUser}
                                  </span>
                                  <div className={`w-2 h-2 rounded-full ${getPlatformColor(interaction.platform)}`} />
                                  <span className="text-xs capitalize text-muted-foreground">
                                    {getInteractionIcon(interaction.interactionType)} {interaction.interactionType}
                                  </span>
                                  {!interaction.isRead && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                  )}
                                </div>
                                
                                <p className="text-sm text-muted-foreground truncate mb-2">
                                  {interaction.message}
                                </p>
                                
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(interaction.createdAt), { addSuffix: true })}
                                  </span>
                                  {interaction.isReplied && (
                                    <span className="text-green-600 flex items-center gap-1">
                                      <Send className="w-3 h-3" />
                                      Replied
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {index < interactions.length - 1 && <Separator />}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Reply Panel */}
            <div className="lg:col-span-1">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    Reply
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col">
                  {selectedInteraction ? (
                    <div className="space-y-4 flex-1 flex flex-col">
                      {/* Selected interaction details */}
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={selectedInteraction.fromUserProfilePic} />
                            <AvatarFallback className="text-xs">
                              {selectedInteraction.fromUserDisplayName?.slice(0, 2).toUpperCase() || '??'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">
                            {selectedInteraction.fromUserDisplayName || selectedInteraction.fromUser}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${getPlatformColor(selectedInteraction.platform)}`} />
                        </div>
                        <p className="text-sm">{selectedInteraction.message}</p>
                      </div>

                      {/* Reply form */}
                      <div className="space-y-3 flex-1 flex flex-col">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateReply}
                            disabled={generateReplyMutation.isPending}
                            className="flex-1"
                            data-testid="button-generate-reply"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {generateReplyMutation.isPending ? 'Generating...' : 'AI Reply'}
                          </Button>
                        </div>
                        
                        <Textarea
                          placeholder="Type your reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="min-h-[100px] flex-1"
                          data-testid="textarea-reply"
                        />
                        
                        <Button
                          onClick={handleSendReply}
                          disabled={!replyText.trim() || replyMutation.isPending}
                          className="w-full"
                          data-testid="button-send-reply"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                        </Button>
                        
                        {selectedInteraction.isReplied && selectedInteraction.actualReply && (
                          <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                              Previous Reply:
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              {selectedInteraction.actualReply}
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              Sent {formatDistanceToNow(new Date(selectedInteraction.repliedAt!), { addSuffix: true })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8 flex-1 flex items-center justify-center flex-col">
                      <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Select an interaction to reply</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
