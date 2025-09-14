import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Percent, Copy, Check } from "lucide-react";

interface AffiliateData {
  id: string;
  affiliateCode: string;
  commissionRate: number;
  totalReferrals: number;
  totalCommissions: number;
  unpaidCommissions: number;
}

export function AffiliateSignup() {
  const [commissionRate] = useState(30);
  const { toast } = useToast();

  const applyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/affiliate/apply', { commissionRate });
    },
    onSuccess: () => {
      toast({
        title: "Application submitted!",
        description: "Your affiliate application has been submitted for review.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Application failed",
        description: error.message || "Failed to submit affiliate application.",
        variant: "destructive",
      });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Join Our Affiliate Program
        </CardTitle>
        <CardDescription>
          Earn 30% commission on every successful referral. Help others discover PostPilot and get rewarded.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary">30%</div>
            <div className="text-sm text-muted-foreground">Commission Rate</div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary">$89.70</div>
            <div className="text-sm text-muted-foreground">Per Monthly Referral</div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">How it works:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Get your unique affiliate code</li>
            <li>• Share with your network</li>
            <li>• Earn 30% commission on successful conversions</li>
            <li>• Monthly payouts via PayPal or Stripe</li>
          </ul>
        </div>

        <Button 
          onClick={() => applyMutation.mutate()}
          disabled={applyMutation.isPending}
          className="w-full"
          data-testid="button-apply-affiliate"
        >
          {applyMutation.isPending ? "Submitting..." : "Apply to Become an Affiliate"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function AffiliateDashboard({ affiliate }: { affiliate: AffiliateData }) {
  const [copied, setCopied] = useState(false);
  
  const copyAffiliateLink = async () => {
    const affiliateLink = `${window.location.origin}/?ref=${affiliate.affiliateCode}`;
    await navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Affiliate Dashboard
          </CardTitle>
          <CardDescription>
            Track your referrals and earnings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold" data-testid="text-total-referrals">{affiliate.totalReferrals}</div>
              <div className="text-sm text-muted-foreground">Total Referrals</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600" data-testid="text-total-commissions">
                ${(affiliate.totalCommissions / 100).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Total Earnings</div>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-orange-600" data-testid="text-unpaid-commissions">
                ${(affiliate.unpaidCommissions / 100).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Pending Payout</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your Affiliate Code</Label>
            <div className="flex gap-2">
              <Input 
                value={affiliate.affiliateCode} 
                readOnly 
                className="font-mono"
                data-testid="input-affiliate-code"
              />
              <Button 
                variant="outline" 
                onClick={copyAffiliateLink}
                className="shrink-0"
                data-testid="button-copy-affiliate-link"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link: {window.location.origin}/?ref={affiliate.affiliateCode}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              <Percent className="h-3 w-3 mr-1" />
              {affiliate.commissionRate}% Commission
            </Badge>
            <Badge variant="outline">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}