import { storage } from "../storage";
import { publishContent } from "./contentGenerator";

const POLL_INTERVAL = 60 * 1000; // Check every minute
const MAX_RETRIES = 3;
const RETRY_DELAY = 5 * 60 * 1000; // 5 minutes

interface FailedPublish {
  contentId: string;
  attempts: number;
  lastAttempt: Date;
}

class AutomatedPublisher {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private failedPublishes: Map<string, FailedPublish> = new Map();

  start() {
    if (this.isRunning) {
      console.log("[automated-publisher] Already running");
      return;
    }

    this.isRunning = true;
    console.log("[automated-publisher] Starting automated publishing service");
    
    // Run immediately, then on interval
    this.checkAndPublish();
    this.intervalId = setInterval(() => this.checkAndPublish(), POLL_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("[automated-publisher] Stopped automated publishing service");
  }

  private async checkAndPublish() {
    try {
      console.log("[automated-publisher] Checking for content to publish...");
      
      try {
        // Get content that should be published
        const contentToPublish = await this.getContentReadyToPublish();
        console.log(`[automated-publisher] Found ${contentToPublish.length} items due for publishing`);
        
        if (contentToPublish.length === 0) {
          console.log("[automated-publisher] No content due for publishing");
          return;
        }
        
        for (const content of contentToPublish) {
          await this.attemptPublish(content.id);
        }
      } catch (error) {
        console.error("[automated-publisher] Error getting content to publish:", error);
      }
      
      // Clean up old failed attempts
      this.cleanupFailedAttempts();
    } catch (error) {
      console.error("[automated-publisher] Error in automated publishing:", error);
    }
  }

  private async attemptPublish(contentId: string) {
    const failed = this.failedPublishes.get(contentId);
    
    // Check if we should retry failed content
    if (failed) {
      if (failed.attempts >= MAX_RETRIES) {
        console.log(`[automated-publisher] Content ${contentId} has exceeded max retries, skipping`);
        return;
      }
      
      const timeSinceLastAttempt = Date.now() - failed.lastAttempt.getTime();
      if (timeSinceLastAttempt < RETRY_DELAY) {
        return; // Too soon to retry
      }
    }

    try {
      console.log(`[automated-publisher] Publishing content ${contentId}`);
      const success = await publishContent(contentId);
      
      if (success) {
        // Update content status to published with timestamp
        await storage.updateContentStatus(contentId, "published", new Date());
        console.log(`[automated-publisher] Successfully published content ${contentId}`);
        // Remove from failed list if it was there
        this.failedPublishes.delete(contentId);
      } else {
        throw new Error("Publishing returned false");
      }
    } catch (error) {
      console.error(`[automated-publisher] Failed to publish content ${contentId}:`, error);
      
      // Track failed attempt
      const currentAttempts = failed ? failed.attempts + 1 : 1;
      this.failedPublishes.set(contentId, {
        contentId,
        attempts: currentAttempts,
        lastAttempt: new Date(),
      });
      
      // Update content status to failed if max retries exceeded
      if (currentAttempts >= MAX_RETRIES) {
        try {
          await storage.updateContentStatus(contentId, "failed");
          console.log(`[automated-publisher] Marked content ${contentId} as failed after ${MAX_RETRIES} attempts`);
        } catch (updateError) {
          console.error(`[automated-publisher] Failed to update content status for ${contentId}:`, updateError);
        }
      }
    }
  }

  private async getContentReadyToPublish() {
    // Get all content that's approved and due for publishing across all businesses
    return await storage.getAllDueContent();
  }

  private cleanupFailedAttempts() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Convert to array to avoid iterator issues
    const entries = Array.from(this.failedPublishes.entries());
    for (const [contentId, failed] of entries) {
      if (failed.attempts >= MAX_RETRIES && failed.lastAttempt < oneHourAgo) {
        this.failedPublishes.delete(contentId);
      }
    }
  }
}

// Singleton instance
const automatedPublisher = new AutomatedPublisher();

export function startAutomatedPublisher() {
  automatedPublisher.start();
}

export function stopAutomatedPublisher() {
  automatedPublisher.stop();
}