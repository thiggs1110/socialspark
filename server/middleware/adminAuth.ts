import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export interface AuthenticatedRequest extends Request {
  user?: any;
  userId?: string;
  isAdmin?: boolean;
}

/**
 * Middleware to check if user is authenticated admin
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Check if user is authenticated first (using same pattern as routes.ts)
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userId = req.user.id;
    
    // Check if user has admin privileges
    const adminUser = await storage.getAdminUser(userId);
    if (!adminUser || !adminUser.isActive) {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.userId = userId;
    req.isAdmin = true;
    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Middleware to check subscription status
 */
export async function requireActiveSubscription(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userId = req.user.id;
    const subscription = await storage.getUserSubscription(userId);

    if (!subscription || !["active", "trialing"].includes(subscription.status)) {
      return res.status(402).json({ 
        error: "Active subscription required",
        subscriptionStatus: subscription?.status || "none"
      });
    }

    req.userId = userId;
    next();
  } catch (error) {
    console.error("Subscription auth error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}