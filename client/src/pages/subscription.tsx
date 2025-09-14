import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CheckCircle, Clock, CreditCard, Users, Percent } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface SubscriptionStatus {
  status: string;
  subscription: any;
}

function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const convertMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      return await apiRequest('POST', '/api/subscription/convert', { paymentMethodId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      onSuccess();
      toast({
        title: "Subscription activated!",
        description: "Welcome to PostPilot! Your subscription is now active.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Payment failed",
        description: error.message || "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setIsProcessing(false);
      return;
    }

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      toast({
        title: "Payment error",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    convertMutation.mutate(paymentMethod.id);
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing || convertMutation.isPending}
        data-testid="button-convert-subscription"
      >
        {isProcessing || convertMutation.isPending ? "Processing..." : "Activate Subscription"}
      </Button>
    </form>
  );
}

function TrialSignup() {
  const [planType, setPlanType] = useState<"monthly" | "annual">("monthly");
  const [affiliateCode, setAffiliateCode] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const { toast } = useToast();

  const startTrialMutation = useMutation({
    mutationFn: async (data: { planType: string; affiliateCode?: string; discountLinkCode?: string }) => {
      return await apiRequest('POST', '/api/subscription/start-trial', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      toast({
        title: "Trial started!",
        description: "Your 7-day free trial has begun. Enjoy exploring PostPilot!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start trial",
        description: error.message || "Unable to start trial. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleStartTrial = () => {
    startTrialMutation.mutate({
      planType,
      affiliateCode: affiliateCode || undefined,
      discountLinkCode: discountCode || undefined,
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle data-testid="text-trial-signup">Start Your Free Trial</CardTitle>
        <CardDescription>
          Try PostPilot free for 7 days. No credit card required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Choose your plan</Label>
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant={planType === "monthly" ? "default" : "outline"}
              onClick={() => setPlanType("monthly")}
              className="justify-between h-auto p-4"
              data-testid="button-monthly-plan"
            >
              <div className="text-left">
                <div className="font-semibold">Monthly Plan</div>
                <div className="text-sm opacity-80">$299/month</div>
              </div>
              <div className="text-xl font-bold">$299</div>
            </Button>
            <Button
              variant={planType === "annual" ? "default" : "outline"}
              onClick={() => setPlanType("annual")}
              className="justify-between h-auto p-4 relative"
              data-testid="button-annual-plan"
            >
              <div className="text-left">
                <div className="font-semibold">Annual Plan</div>
                <div className="text-sm opacity-80">$2,499/year</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">$2,499</div>
                <Badge variant="secondary" className="text-xs">Save 30%</Badge>
              </div>
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <Label htmlFor="affiliate-code">Affiliate Code (Optional)</Label>
            <Input
              id="affiliate-code"
              placeholder="Enter affiliate code"
              value={affiliateCode}
              onChange={(e) => setAffiliateCode(e.target.value)}
              data-testid="input-affiliate-code"
            />
          </div>
          <div>
            <Label htmlFor="discount-code">Discount Code (Optional)</Label>
            <Input
              id="discount-code"
              placeholder="Enter discount code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              data-testid="input-discount-code"
            />
          </div>
        </div>

        <Button 
          onClick={handleStartTrial}
          className="w-full"
          disabled={startTrialMutation.isPending}
          data-testid="button-start-trial"
        >
          {startTrialMutation.isPending ? "Starting Trial..." : "Start Free Trial"}
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          Your trial will automatically expire in 7 days. You can upgrade to a paid plan at any time.
        </div>
      </CardContent>
    </Card>
  );
}

function SubscriptionDetails({ subscription }: { subscription: any }) {
  const planName = subscription.planId?.includes("annual") ? "Annual Plan" : "Monthly Plan";
  const price = subscription.planId?.includes("annual") ? "$2,499/year" : "$299/month";
  const isTrialing = subscription.status === "trialing";
  const isActive = subscription.status === "active";

  const trialEndDate = subscription.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleDateString() : null;
  const nextBillingDate = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Your Subscription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">Plan</span>
          <div className="text-right">
            <div data-testid="text-plan-name">{planName}</div>
            <div className="text-sm text-muted-foreground">{price}</div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="font-medium">Status</span>
          <Badge 
            variant={isActive ? "default" : isTrialing ? "secondary" : "destructive"}
            data-testid="badge-subscription-status"
          >
            {isTrialing && <Clock className="h-3 w-3 mr-1" />}
            {isActive && <CheckCircle className="h-3 w-3 mr-1" />}
            {isTrialing ? "Free Trial" : isActive ? "Active" : subscription.status}
          </Badge>
        </div>

        {isTrialing && trialEndDate && (
          <div className="flex justify-between items-center">
            <span className="font-medium">Trial Ends</span>
            <span data-testid="text-trial-end-date">{trialEndDate}</span>
          </div>
        )}

        {isActive && nextBillingDate && (
          <div className="flex justify-between items-center">
            <span className="font-medium">Next Billing</span>
            <span data-testid="text-next-billing-date">{nextBillingDate}</span>
          </div>
        )}

        {subscription.affiliateId && (
          <div className="flex justify-between items-center">
            <span className="font-medium">Referred By</span>
            <Badge variant="outline">
              <Users className="h-3 w-3 mr-1" />
              Affiliate Program
            </Badge>
          </div>
        )}

        {subscription.discountLinkId && (
          <div className="flex justify-between items-center">
            <span className="font-medium">Discount Applied</span>
            <Badge variant="outline">
              <Percent className="h-3 w-3 mr-1" />
              Special Pricing
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Subscription() {
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const { data: subscriptionStatus, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const hasSubscription = subscriptionStatus?.subscription;
  const isTrialing = subscriptionStatus?.status === "trialing";
  const isActive = subscriptionStatus?.status === "active";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-subscription-title">Subscription</h1>
        <p className="text-muted-foreground">
          Manage your PostPilot subscription and billing.
        </p>
      </div>

      {!hasSubscription && (
        <TrialSignup />
      )}

      {hasSubscription && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SubscriptionDetails subscription={subscriptionStatus.subscription} />

          {isTrialing && (
            <Card>
              <CardHeader>
                <CardTitle>Upgrade to Paid Plan</CardTitle>
                <CardDescription>
                  Convert your trial to a paid subscription to continue using PostPilot after your trial ends.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showPaymentForm ? (
                  <Button 
                    onClick={() => setShowPaymentForm(true)}
                    className="w-full"
                    data-testid="button-show-payment-form"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                ) : (
                  <Elements stripe={stripePromise}>
                    <PaymentForm onSuccess={() => setShowPaymentForm(false)} />
                  </Elements>
                )}
              </CardContent>
            </Card>
          )}

          {isActive && (
            <Card>
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
                <CardDescription>
                  Your subscription is active and being billed automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Subscription Active</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Your payment method will be charged automatically on your next billing date.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}