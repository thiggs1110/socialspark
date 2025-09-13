import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, Send, Edit } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addDays } from "date-fns";
import type { Content } from "@shared/schema";

const platformInfo: Record<string, { name: string; color: string; icon: string }> = {
  facebook: { name: "Facebook", color: "bg-blue-500", icon: "f" },
  instagram: { name: "Instagram", color: "bg-gradient-to-r from-purple-500 to-pink-500", icon: "📷" },
  linkedin: { name: "LinkedIn", color: "bg-blue-600", icon: "in" },
  twitter: { name: "Twitter", color: "bg-blue-400", icon: "𝕏" },
  pinterest: { name: "Pinterest", color: "bg-red-500", icon: "📌" },
};

export default function Schedule() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("09:00");

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

  // Fetch scheduled content for the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const { data: scheduledContent, isLoading: isLoadingScheduled } = useQuery<Content[]>({
    queryKey: ["/api/content/scheduled", { startDate: monthStart.toISOString(), endDate: monthEnd.toISOString() }],
    retry: false,
    enabled: !!isAuthenticated,
  });

  // Fetch publishing queue
  const { data: publishingQueue, isLoading: isLoadingQueue } = useQuery<Content[]>({
    queryKey: ["/api/content/publishing-queue"],
    retry: false,
    enabled: !!isAuthenticated,
  });

  // Fetch pending content for scheduling
  const { data: pendingContent } = useQuery<Content[]>({
    queryKey: ["/api/content", { status: "pending" }],
    retry: false,
    enabled: !!isAuthenticated,
  });

  const scheduleMutation = useMutation({
    mutationFn: async ({ contentId, scheduledFor }: { contentId: string; scheduledFor: Date }) => {
      return await apiRequest("PATCH", `/api/content/${contentId}/schedule`, {
        scheduledFor: scheduledFor.toISOString(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Content Scheduled",
        description: "Content has been scheduled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content/scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      setSelectedDate(null);
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
        title: "Scheduling Failed",
        description: "Failed to schedule content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (contentId: string) => {
      return await apiRequest("PATCH", `/api/content/${contentId}/publish`, {});
    },
    onSuccess: () => {
      toast({
        title: "Content Published",
        description: "Content has been published successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content/publishing-queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content/scheduled"] });
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
        title: "Publishing Failed",
        description: "Failed to publish content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleScheduleContent = (contentId: string) => {
    if (!selectedDate) return;
    
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    
    scheduleMutation.mutate({ contentId, scheduledFor: scheduledDateTime });
  };

  const getContentForDate = (date: Date) => {
    if (!scheduledContent) return [];
    return scheduledContent.filter(content => 
      content.scheduledFor && isSameDay(new Date(content.scheduledFor), date)
    );
  };

  const renderCalendarGrid = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = addDays(monthStart, -monthStart.getDay()); // Start from Sunday
    const calendarEnd = addDays(monthEnd, 6 - monthEnd.getDay()); // End on Saturday
    
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const today = new Date();

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map((date) => {
          const dayContent = getContentForDate(date);
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isToday = isSameDay(date, today);
          
          return (
            <div
              key={date.toISOString()}
              className={`min-h-24 p-1 border border-border rounded-lg cursor-pointer hover:bg-muted/50 ${
                !isCurrentMonth ? "opacity-50" : ""
              } ${isToday ? "bg-primary/10" : "bg-card"}`}
              onClick={() => setSelectedDate(date)}
              data-testid={`calendar-day-${format(date, 'yyyy-MM-dd')}`}
            >
              <div className="text-sm font-medium mb-1">
                {format(date, "d")}
              </div>
              <div className="space-y-1">
                {dayContent.slice(0, 2).map((content, index) => {
                  const platform = platformInfo[content.platform] || { name: content.platform, color: "bg-gray-500", icon: "?" };
                  return (
                    <div
                      key={`${content.id}-${index}`}
                      className={`text-xs p-1 rounded ${platform.color} text-white truncate`}
                      title={content.content}
                      data-testid={`scheduled-content-${content.id}`}
                    >
                      {platform.icon} {format(new Date(content.scheduledFor!), "HH:mm")}
                    </div>
                  );
                })}
                {dayContent.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayContent.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading schedule...</p>
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
          title="Content Schedule"
          subtitle="View and manage your posting schedule"
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Calendar */}
            <div className="xl:col-span-3">
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>{format(currentDate, "MMMM yyyy")}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                        data-testid="button-prev-month"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDate(new Date())}
                        data-testid="button-today"
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                        data-testid="button-next-month"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingScheduled ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    renderCalendarGrid()
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Publishing Queue */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Send className="w-5 h-5" />
                    <span>Ready to Publish</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingQueue ? (
                    <div className="flex items-center justify-center h-20">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {publishingQueue && publishingQueue.length > 0 ? (
                        publishingQueue.map((content) => {
                          const platform = platformInfo[content.platform] || { name: content.platform, color: "bg-gray-500", icon: "?" };
                          return (
                            <div key={content.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <div className={`w-4 h-4 ${platform.color} rounded flex items-center justify-center text-white text-xs`}>
                                    {platform.icon}
                                  </div>
                                  <span className="text-sm font-medium">{platform.name}</span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {content.content.substring(0, 50)}...
                                </p>
                                {content.scheduledFor && (
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(content.scheduledFor), "MMM d, h:mm a")}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => publishMutation.mutate(content.id)}
                                disabled={publishMutation.isPending}
                                className="ml-2"
                                data-testid={`button-publish-${content.id}`}
                              >
                                <Send className="w-3 h-3" />
                              </Button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No content ready to publish
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Schedule Content Dialog */}
              <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
                <DialogContent data-testid="schedule-content-dialog">
                  <DialogHeader>
                    <DialogTitle>
                      Schedule Content for {selectedDate && format(selectedDate, "MMM d, yyyy")}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Time</label>
                      <Select value={selectedTime} onValueChange={setSelectedTime} data-testid="select-time">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, '0');
                            return (
                              <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                                {hour}:00
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Select Content to Schedule</label>
                      {pendingContent && pendingContent.length > 0 ? (
                        pendingContent.map((content) => {
                          const platform = platformInfo[content.platform] || { name: content.platform, color: "bg-gray-500", icon: "?" };
                          return (
                            <div key={content.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <div className={`w-4 h-4 ${platform.color} rounded flex items-center justify-center text-white text-xs`}>
                                    {platform.icon}
                                  </div>
                                  <span className="text-sm font-medium">{platform.name}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {content.content.substring(0, 100)}...
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleScheduleContent(content.id)}
                                disabled={scheduleMutation.isPending}
                                data-testid={`button-schedule-${content.id}`}
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                Schedule
                              </Button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No pending content available for scheduling
                        </p>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
