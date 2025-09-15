import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChartContainer, 
  ChartTooltip,
  ChartTooltipContent 
} from "@/components/ui/chart";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  Eye, 
  Heart, 
  Share, 
  MessageCircle, 
  Download,
  Calendar
} from "lucide-react";

interface AnalyticsOverview {
  totalPosts: number;
  totalViews: number;
  totalEngagements: number;
  avgEngagementRate: number;
  topPlatforms: Array<{ platform: string; posts: number; engagement: number }>;
  dailyStats: Array<{ date: string; posts: number; views: number; engagements: number }>;
}

interface ContentPerformance {
  id: string;
  title: string;
  platform: string;
  publishedAt: string | null;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  engagementRate: number;
}

const chartConfig = {
  views: {
    label: "Views",
    color: "hsl(var(--chart-1))",
  },
  engagements: {
    label: "Engagements", 
    color: "hsl(var(--chart-2))",
  },
  posts: {
    label: "Posts",
    color: "hsl(var(--chart-3))",
  },
} as const;

export default function Analytics() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [timeRange, setTimeRange] = useState("30");

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

  // Fetch analytics overview
  const { data: overview, isLoading: overviewLoading } = useQuery<AnalyticsOverview>({
    queryKey: ['/api/analytics/overview', { days: timeRange }],
    queryFn: () => fetch(`/api/analytics/overview?days=${timeRange}`).then(res => res.json()),
    enabled: isAuthenticated,
  });

  // Fetch content performance
  const { data: contentPerformance, isLoading: performanceLoading } = useQuery<ContentPerformance[]>({
    queryKey: ['/api/analytics/content-performance', { limit: 10 }],
    queryFn: () => fetch(`/api/analytics/content-performance?limit=10`).then(res => res.json()),
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const platformColors = {
    facebook: "#1877F2",
    instagram: "#E4405F", 
    linkedin: "#0A66C2",
    twitter: "#1DA1F2",
    pinterest: "#BD081C"
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Analytics Dashboard"
          subtitle="Track your social media performance and insights"
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Time Range Selector and Export */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40" data-testid="select-time-range">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              data-testid="button-export"
              onClick={async () => {
                try {
                  const response = await fetch(`/api/analytics/export?days=${timeRange}`);
                  if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `analytics-report-${timeRange}days.csv`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } else {
                    throw new Error('Export failed');
                  }
                } catch (error) {
                  toast({
                    title: "Export Failed",
                    description: "Unable to generate report. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={overviewLoading || !overview || overview.totalPosts === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card data-testid="card-total-posts">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-posts">
                  {overviewLoading ? "..." : overview?.totalPosts || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last {timeRange} days
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-views">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-views">
                  {overviewLoading ? "..." : (overview?.totalViews || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all platforms
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-engagements">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Engagements</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-engagements">
                  {overviewLoading ? "..." : (overview?.totalEngagements || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Likes, shares, comments
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-engagement-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Engagement Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-engagement-rate">
                  {overviewLoading ? "..." : `${overview?.avgEngagementRate || 0}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average across all content
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Performance Chart */}
            <Card data-testid="chart-daily-performance">
              <CardHeader>
                <CardTitle>Daily Performance</CardTitle>
                <CardDescription>Views and engagements over time</CardDescription>
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-80">
                    <LineChart data={overview?.dailyStats || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line 
                        type="monotone" 
                        dataKey="views" 
                        stroke="var(--color-views)" 
                        strokeWidth={2}
                        name="Views"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="engagements" 
                        stroke="var(--color-engagements)" 
                        strokeWidth={2}
                        name="Engagements"
                      />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Platform Performance Chart */}
            <Card data-testid="chart-platform-performance">
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
                <CardDescription>Posts and engagement by platform</CardDescription>
              </CardHeader>
              <CardContent>
                {overviewLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-80">
                    <BarChart data={overview?.topPlatforms || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="platform" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="posts" fill="var(--color-posts)" name="Posts" />
                      <Bar dataKey="engagement" fill="var(--color-engagements)" name="Engagement" />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Content */}
          <Card data-testid="table-top-content">
            <CardHeader>
              <CardTitle>Top Performing Content</CardTitle>
              <CardDescription>Your best performing posts recently</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-12 w-12 bg-muted rounded animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse"></div>
                        <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Content</th>
                        <th className="text-left p-2">Platform</th>
                        <th className="text-left p-2">Views</th>
                        <th className="text-left p-2">Likes</th>
                        <th className="text-left p-2">Shares</th>
                        <th className="text-left p-2">Comments</th>
                        <th className="text-left p-2">Engagement Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contentPerformance?.slice(0, 10).map((content) => (
                        <tr key={content.id} className="border-b" data-testid={`content-row-${content.id}`}>
                          <td className="p-2">
                            <div className="font-medium text-sm">{content.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {content.publishedAt ? new Date(content.publishedAt).toLocaleDateString() : 'Draft'}
                            </div>
                          </td>
                          <td className="p-2">
                            <span className="capitalize text-sm">{content.platform}</span>
                          </td>
                          <td className="p-2 text-sm">{content.views.toLocaleString()}</td>
                          <td className="p-2 text-sm">{content.likes.toLocaleString()}</td>
                          <td className="p-2 text-sm">{content.shares.toLocaleString()}</td>
                          <td className="p-2 text-sm">{content.comments.toLocaleString()}</td>
                          <td className="p-2 text-sm font-medium">{content.engagementRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!contentPerformance || contentPerformance.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No content performance data available yet.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
