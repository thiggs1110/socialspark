import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Link as LinkIcon,
  Plus,
  Copy,
  Check,
  BarChart3,
  UserCheck,
  Percent
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  monthlyRevenue: number;
  annualRevenue: number;
  totalRevenue: number;
  conversionRate: number;
  affiliateCommissions: number;
}

interface UserMetrics {
  id: string;
  email: string;
  subscriptionStatus: string;
  planType: string;
  trialEndsAt: string | null;
  totalSpent: number;
  joinedAt: string;
}

interface AffiliateMetrics {
  id: string;
  affiliateCode: string;
  userEmail: string;
  totalReferrals: number;
  totalCommissions: number;
  unpaidCommissions: number;
  conversionRate: number;
}

interface DiscountLink {
  id: string;
  code: string;
  monthlyPrice: number;
  annualPrice: number;
  usageCount: number;
  maxUsages: number | null;
  expiresAt: string | null;
  isActive: boolean;
}

function AdminOverview() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
  });

  if (isLoading) {
    return <div className="grid grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-8 bg-muted rounded w-3/4"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>;
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="stat-total-users">
            {stats?.totalUsers || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            All registered users
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="stat-active-subscriptions">
            {stats?.activeSubscriptions || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            Paying customers
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="stat-trial-users">
            {stats?.trialUsers || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            On free trial
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="stat-conversion-rate">
            {stats?.conversionRate ? `${stats.conversionRate.toFixed(1)}%` : '0%'}
          </div>
          <p className="text-xs text-muted-foreground">
            Trial to paid
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="stat-monthly-revenue">
            ${stats?.monthlyRevenue ? (stats.monthlyRevenue / 100).toFixed(0) : '0'}
          </div>
          <p className="text-xs text-muted-foreground">
            MRR from active subs
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Annual Revenue</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="stat-annual-revenue">
            ${stats?.annualRevenue ? (stats.annualRevenue / 100).toFixed(0) : '0'}
          </div>
          <p className="text-xs text-muted-foreground">
            ARR from annual plans
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="stat-total-revenue">
            ${stats?.totalRevenue ? (stats.totalRevenue / 100).toFixed(0) : '0'}
          </div>
          <p className="text-xs text-muted-foreground">
            All time revenue
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Affiliate Commissions</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="stat-affiliate-commissions">
            ${stats?.affiliateCommissions ? (stats.affiliateCommissions / 100).toFixed(0) : '0'}
          </div>
          <p className="text-xs text-muted-foreground">
            Total commissions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function UserManagement() {
  const { data: users, isLoading } = useQuery<UserMetrics[]>({
    queryKey: ['/api/admin/users'],
  });

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-muted rounded"></div>
      ))}
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">User Management</h3>
        <Badge variant="outline">{users?.length || 0} users</Badge>
      </div>
      
      <div className="space-y-2">
        {users?.map((user) => (
          <Card key={user.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <div className="font-medium" data-testid={`user-email-${user.id}`}>
                  {user.email}
                </div>
                <div className="text-sm text-muted-foreground">
                  Joined {new Date(user.joinedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium">
                    ${(user.totalSpent / 100).toFixed(2)} spent
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user.planType || 'No plan'}
                  </div>
                </div>
                <Badge 
                  variant={
                    user.subscriptionStatus === 'active' ? 'default' : 
                    user.subscriptionStatus === 'trialing' ? 'secondary' : 'destructive'
                  }
                  data-testid={`user-status-${user.id}`}
                >
                  {user.subscriptionStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AffiliateManagement() {
  const { data: affiliates, isLoading } = useQuery<AffiliateMetrics[]>({
    queryKey: ['/api/admin/affiliates'],
  });

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-muted rounded"></div>
      ))}
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Affiliate Management</h3>
        <Badge variant="outline">{affiliates?.length || 0} affiliates</Badge>
      </div>
      
      <div className="grid gap-4">
        {affiliates?.map((affiliate) => (
          <Card key={affiliate.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium" data-testid={`affiliate-email-${affiliate.id}`}>
                    {affiliate.userEmail}
                  </div>
                  <div className="text-sm text-muted-foreground font-mono">
                    Code: {affiliate.affiliateCode}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold" data-testid={`affiliate-referrals-${affiliate.id}`}>
                      {affiliate.totalReferrals}
                    </div>
                    <div className="text-xs text-muted-foreground">Referrals</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-green-600">
                      ${(affiliate.totalCommissions / 100).toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Earned</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-orange-600">
                      ${(affiliate.unpaidCommissions / 100).toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Badge variant="secondary">
                  {affiliate.conversionRate.toFixed(1)}% conversion
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DiscountLinkManagement() {
  const [newLinkData, setNewLinkData] = useState({
    monthlyPrice: 19900, // $199
    annualPrice: 199900, // $1999
    maxUsages: '',
    expiresAt: '',
  });
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: discountLinks, isLoading } = useQuery<DiscountLink[]>({
    queryKey: ['/api/admin/discount-links'],
  });

  const createLinkMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/admin/discount-links', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/discount-links'] });
      setNewLinkData({
        monthlyPrice: 19900,
        annualPrice: 199900,
        maxUsages: '',
        expiresAt: '',
      });
      toast({
        title: "Discount link created!",
        description: "The new discount link is now active.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create link",
        description: error.message || "Unable to create discount link.",
        variant: "destructive",
      });
    }
  });

  const copyDiscountLink = async (code: string) => {
    const link = `${window.location.origin}/?discount=${code}`;
    await navigator.clipboard.writeText(link);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreateLink = () => {
    const data = {
      monthlyPrice: newLinkData.monthlyPrice,
      annualPrice: newLinkData.annualPrice,
      maxUsages: newLinkData.maxUsages ? parseInt(newLinkData.maxUsages) : null,
      expiresAt: newLinkData.expiresAt || null,
    };
    createLinkMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Discount Link</CardTitle>
          <CardDescription>
            Generate custom discount links with special pricing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="monthly-price">Monthly Price (cents)</Label>
              <Input
                id="monthly-price"
                type="number"
                value={newLinkData.monthlyPrice}
                onChange={(e) => setNewLinkData({...newLinkData, monthlyPrice: parseInt(e.target.value)})}
                placeholder="19900"
                data-testid="input-monthly-price"
              />
              <p className="text-xs text-muted-foreground">
                ${(newLinkData.monthlyPrice / 100).toFixed(2)}/month
              </p>
            </div>
            <div>
              <Label htmlFor="annual-price">Annual Price (cents)</Label>
              <Input
                id="annual-price"
                type="number"
                value={newLinkData.annualPrice}
                onChange={(e) => setNewLinkData({...newLinkData, annualPrice: parseInt(e.target.value)})}
                placeholder="199900"
                data-testid="input-annual-price"
              />
              <p className="text-xs text-muted-foreground">
                ${(newLinkData.annualPrice / 100).toFixed(2)}/year
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max-usages">Max Uses (optional)</Label>
              <Input
                id="max-usages"
                type="number"
                value={newLinkData.maxUsages}
                onChange={(e) => setNewLinkData({...newLinkData, maxUsages: e.target.value})}
                placeholder="Leave empty for unlimited"
                data-testid="input-max-usages"
              />
            </div>
            <div>
              <Label htmlFor="expires-at">Expires At (optional)</Label>
              <Input
                id="expires-at"
                type="datetime-local"
                value={newLinkData.expiresAt}
                onChange={(e) => setNewLinkData({...newLinkData, expiresAt: e.target.value})}
                data-testid="input-expires-at"
              />
            </div>
          </div>
          <Button 
            onClick={handleCreateLink}
            disabled={createLinkMutation.isPending}
            data-testid="button-create-discount-link"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createLinkMutation.isPending ? "Creating..." : "Create Discount Link"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Active Discount Links</h3>
          <Badge variant="outline">{discountLinks?.length || 0} links</Badge>
        </div>
        
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {discountLinks?.map((link) => (
              <Card key={link.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="font-mono font-medium" data-testid={`discount-code-${link.id}`}>
                      {link.code}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${(link.monthlyPrice / 100).toFixed(0)}/mo, ${(link.annualPrice / 100).toFixed(0)}/yr
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div data-testid={`discount-usage-${link.id}`}>
                        {link.usageCount} {link.maxUsages ? `/ ${link.maxUsages}` : ''} uses
                      </div>
                      {link.expiresAt && (
                        <div className="text-muted-foreground">
                          Expires {new Date(link.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline" 
                      size="sm"
                      onClick={() => copyDiscountLink(link.code)}
                      data-testid={`button-copy-discount-${link.id}`}
                    >
                      {copied === link.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Badge variant={link.isActive ? "default" : "secondary"}>
                      {link.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, monitor revenue, and track affiliate performance.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          <TabsTrigger value="affiliates" data-testid="tab-affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="discounts" data-testid="tab-discounts">Discount Links</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AdminOverview />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="affiliates" className="space-y-6">
          <AffiliateManagement />
        </TabsContent>

        <TabsContent value="discounts" className="space-y-6">
          <DiscountLinkManagement />
        </TabsContent>
      </Tabs>
      </div>
    </AdminGuard>
  );
}