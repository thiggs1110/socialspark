import { IStorage } from '../storage';
import { sendTrialExpirationReminder, sendTrialExpiredNotification } from './emailService';

export class TrialManagementService {
  constructor(private storage: IStorage) {}

  /**
   * Check for trials that are expiring soon (1 day warning)
   */
  async sendExpirationReminders(): Promise<void> {
    console.log('[trial-manager] Checking for trials expiring in 24 hours...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999); // End of tomorrow
    
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    try {
      const expiringSoon = await this.storage.getExpiringTrials(today, tomorrow);
      
      console.log(`[trial-manager] Found ${expiringSoon.length} trials expiring tomorrow`);
      
      for (const subscription of expiringSoon) {
        try {
          const user = await this.storage.getUserById(subscription.userId);
          if (user?.email) {
            await sendTrialExpirationReminder(
              user.email,
              user.firstName || 'there',
              subscription.trialEndsAt!
            );
            
            // Mark as reminder sent to avoid duplicate emails
            await this.storage.markTrialReminderSent(subscription.id);
            
            console.log(`[trial-manager] Sent expiration reminder to ${user.email}`);
          }
        } catch (error) {
          console.error(`[trial-manager] Failed to send reminder for subscription ${subscription.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[trial-manager] Error checking expiring trials:', error);
    }
  }

  /**
   * Check for expired trials and update their status
   */
  async processExpiredTrials(): Promise<void> {
    console.log('[trial-manager] Checking for expired trials...');
    
    const now = new Date();
    
    try {
      const expiredTrials = await this.storage.getExpiredTrials(now);
      
      console.log(`[trial-manager] Found ${expiredTrials.length} expired trials`);
      
      for (const subscription of expiredTrials) {
        try {
          // Update subscription status to expired
          await this.storage.updateSubscriptionStatus(subscription.id, 'trial_expired');
          
          // Send expiration notification
          const user = await this.storage.getUserById(subscription.userId);
          if (user?.email) {
            await sendTrialExpiredNotification(
              user.email,
              user.firstName || 'there'
            );
            
            // Mark notification as sent
            await this.storage.markTrialExpirationNotificationSent(subscription.id);
            
            console.log(`[trial-manager] Trial expired and notification sent to ${user.email}`);
          }
          
          console.log(`[trial-manager] Processed expired trial for user ${subscription.userId}`);
        } catch (error) {
          console.error(`[trial-manager] Failed to process expired trial ${subscription.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[trial-manager] Error processing expired trials:', error);
    }
  }

  /**
   * Run the complete trial management cycle
   */
  async runTrialManagement(): Promise<void> {
    console.log('[trial-manager] Starting trial management cycle...');
    
    try {
      await this.sendExpirationReminders();
      await this.processExpiredTrials();
      console.log('[trial-manager] Trial management cycle completed successfully');
    } catch (error) {
      console.error('[trial-manager] Error in trial management cycle:', error);
    }
  }

  /**
   * Get trial statistics for admin dashboard
   */
  async getTrialStatistics(): Promise<{
    totalTrials: number;
    activeTrials: number;
    expiredTrials: number;
    expiringToday: number;
    expiringSoon: number;
  }> {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    try {
      const [totalTrials, activeTrials, expiredTrials, expiringToday, expiringSoon] = await Promise.all([
        this.storage.countTrialsByStatus('all'),
        this.storage.countTrialsByStatus('trialing'),
        this.storage.countTrialsByStatus('trial_expired'),
        this.storage.getExpiringTrials(now, today).then(trials => trials.length),
        this.storage.getExpiringTrials(today, tomorrow).then(trials => trials.length),
      ]);

      return {
        totalTrials,
        activeTrials,
        expiredTrials,
        expiringToday,
        expiringSoon,
      };
    } catch (error) {
      console.error('[trial-manager] Error getting trial statistics:', error);
      return {
        totalTrials: 0,
        activeTrials: 0,
        expiredTrials: 0,
        expiringToday: 0,
        expiringSoon: 0,
      };
    }
  }
}