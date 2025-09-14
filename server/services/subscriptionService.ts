import Stripe from "stripe";
import { storage } from "../storage";
import type { 
  InsertUserSubscription, 
  InsertPaymentHistory, 
  InsertReferral, 
  InsertCommission,
  User
} from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Plan pricing constants
export const PLAN_PRICES = {
  monthly: 29900, // $299 in cents
  annual: 249900, // $2499 in cents
  monthly_discount: 19900, // $199 in cents
  annual_discount: 199900, // $1999 in cents
};

export class SubscriptionService {
  /**
   * Initialize subscription plans in the database
   */
  static async initializePlans() {
    const existingPlans = await storage.getSubscriptionPlans();
    
    if (existingPlans.length === 0) {
      // Create default subscription plans
      await storage.createSubscriptionPlan({
        name: "monthly",
        displayName: "Monthly Plan",
        price: PLAN_PRICES.monthly,
        interval: "month",
        trialDays: 7,
        isActive: true,
      });

      await storage.createSubscriptionPlan({
        name: "annual",
        displayName: "Annual Plan", 
        price: PLAN_PRICES.annual,
        interval: "year",
        trialDays: 7,
        isActive: true,
      });

      console.log("Default subscription plans created");
    }
  }

  /**
   * Start a trial subscription for a new user
   */
  static async startTrial(
    userId: string, 
    planType: "monthly" | "annual" = "monthly",
    affiliateCode?: string,
    discountLinkCode?: string
  ): Promise<{ subscription: any; stripeCustomer: Stripe.Customer }> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if user already has a subscription
    const existingSubscription = await storage.getUserSubscription(userId);
    if (existingSubscription) {
      throw new Error("User already has a subscription");
    }

    // Create Stripe customer
    const stripeCustomer = await stripe.customers.create({
      email: user.email || undefined,
      name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
    });

    // Get subscription plan
    const plans = await storage.getActiveSubscriptionPlans();
    const plan = plans.find(p => p.name === planType);
    if (!plan) {
      throw new Error(`Plan ${planType} not found`);
    }

    // Set trial end date (7 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // Handle affiliate tracking
    let affiliateId: string | undefined;
    if (affiliateCode) {
      const affiliate = await storage.getAffiliateByCode(affiliateCode);
      if (affiliate && affiliate.isActive) {
        affiliateId = affiliate.id;
        
        // Create referral record
        await storage.createReferral({
          affiliateId: affiliate.id,
          referredUserId: userId,
          status: "pending",
        });
      }
    }

    // Handle discount link tracking
    let discountLinkId: string | undefined;
    if (discountLinkCode) {
      const discountLink = await storage.getDiscountLinkByCode(discountLinkCode);
      if (discountLink && discountLink.isActive) {
        // Check usage limits
        if (discountLink.usageLimit && discountLink.usageCount >= discountLink.usageLimit) {
          throw new Error("Discount link usage limit exceeded");
        }
        if (discountLink.expiresAt && new Date() > discountLink.expiresAt) {
          throw new Error("Discount link has expired");
        }
        
        discountLinkId = discountLink.id;
        await storage.incrementDiscountLinkUsage(discountLink.id);
      }
    }

    // Create user subscription
    const subscription = await storage.createUserSubscription({
      userId,
      planId: plan.id,
      stripeCustomerId: stripeCustomer.id,
      status: "trialing",
      trialEndsAt,
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEndsAt,
      affiliateId,
      discountLinkId,
    });

    return { subscription, stripeCustomer };
  }

  /**
   * Convert trial to paid subscription
   */
  static async convertToSubscription(
    userId: string,
    paymentMethodId: string
  ): Promise<Stripe.Subscription> {
    const userSubscription = await storage.getUserSubscription(userId);
    if (!userSubscription || userSubscription.status !== "trialing") {
      throw new Error("No active trial found for user");
    }

    const plan = await storage.getSubscriptionPlans();
    const currentPlan = plan.find(p => p.id === userSubscription.planId);
    if (!currentPlan) {
      throw new Error("Subscription plan not found");
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: userSubscription.stripeCustomerId!,
    });

    // Set as default payment method
    await stripe.customers.update(userSubscription.stripeCustomerId!, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: userSubscription.stripeCustomerId!,
      items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: currentPlan.displayName,
          },
          unit_amount: currentPlan.price,
          recurring: {
            interval: currentPlan.interval as "month" | "year",
          },
        },
      }],
      expand: ['latest_invoice.payment_intent'],
    });

    // Update subscription status
    await storage.updateUserSubscription(userSubscription.id, {
      stripeSubscriptionId: stripeSubscription.id,
      status: "active",
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    });

    // Handle affiliate commission if applicable
    if (userSubscription.affiliateId) {
      await this.createAffiliateCommission(userSubscription.affiliateId, userSubscription.id, currentPlan.price);
    }

    return stripeSubscription;
  }

  /**
   * Create affiliate commission
   */
  static async createAffiliateCommission(affiliateId: string, subscriptionId: string, subscriptionPrice: number) {
    const affiliate = await storage.getAffiliateByUserId("");
    const referral = await storage.getReferralsByAffiliate(affiliateId);
    const matchingReferral = referral.find(r => r.subscriptionId === subscriptionId);
    
    if (matchingReferral) {
      // Calculate commission (default 30%)
      const commissionAmount = Math.round(subscriptionPrice * 0.30);
      
      await storage.createCommission({
        affiliateId,
        referralId: matchingReferral.id,
        amount: commissionAmount,
        status: "pending",
      });

      // Update referral status
      await storage.updateReferralStatus(matchingReferral.id, "converted", new Date());

      // Update affiliate totals
      const currentAffiliate = await storage.getAffiliateByUserId(affiliateId);
      if (currentAffiliate) {
        await storage.updateAffiliate(affiliateId, {
          totalReferrals: currentAffiliate.totalReferrals + 1,
          totalCommissions: currentAffiliate.totalCommissions + commissionAmount,
          unpaidCommissions: currentAffiliate.unpaidCommissions + commissionAmount,
        });
      }
    }
  }

  /**
   * Get subscription status for user
   */
  static async getSubscriptionStatus(userId: string) {
    const subscription = await storage.getUserSubscription(userId);
    if (!subscription) {
      return { status: "none", subscription: null };
    }

    // Check if trial has expired
    if (subscription.status === "trialing" && subscription.trialEndsAt && new Date() > subscription.trialEndsAt) {
      await storage.updateUserSubscription(subscription.id, { status: "past_due" });
      return { status: "trial_expired", subscription };
    }

    return { status: subscription.status, subscription };
  }

  /**
   * Handle Stripe webhook events
   */
  static async handleStripeWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
    }
  }

  private static async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const subscription = await storage.getUserSubscription("");
    // Find subscription by stripe customer ID and update payment history
    // Implementation depends on finding the subscription first
  }

  private static async handlePaymentFailed(invoice: Stripe.Invoice) {
    // Handle failed payment logic
  }

  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    // Update local subscription record
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    // Handle subscription cancellation
  }

  /**
   * Create a custom discount link
   */
  static async createDiscountLink(
    adminUserId: string,
    linkData: {
      name: string;
      description?: string;
      monthlyPrice?: number;
      annualPrice?: number;
      usageLimit?: number;
      expiresAt?: Date;
    }
  ) {
    // Generate unique link code
    const linkCode = Math.random().toString(36).substring(2, 15);
    
    return await storage.createDiscountLink({
      linkCode,
      createdBy: adminUserId,
      ...linkData,
    });
  }

  /**
   * Generate affiliate code for user
   */
  static async createAffiliate(userId: string, commissionRate: number = 30) {
    const existingAffiliate = await storage.getAffiliateByUserId(userId);
    if (existingAffiliate) {
      throw new Error("User is already an affiliate");
    }

    // Generate unique affiliate code
    const affiliateCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    return await storage.createAffiliate({
      userId,
      affiliateCode,
      commissionRate,
    });
  }
}