import { TrialManagementService } from './trialManagementService';
import { storage } from '../storage';

export class ScheduledTrialManager {
  private trialService: TrialManagementService;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60 * 60 * 1000; // Run every hour

  constructor() {
    this.trialService = new TrialManagementService(storage);
  }

  /**
   * Start the scheduled trial management service
   */
  start(): void {
    if (this.intervalId) {
      console.log('[scheduled-trial-manager] Service already running');
      return;
    }

    console.log('[scheduled-trial-manager] Starting automated trial management service');
    
    // Run immediately on start
    this.runTrialManagement();
    
    // Then run every hour
    this.intervalId = setInterval(() => {
      this.runTrialManagement();
    }, this.CHECK_INTERVAL);

    console.log(`[scheduled-trial-manager] Service scheduled to run every ${this.CHECK_INTERVAL / 60000} minutes`);
  }

  /**
   * Stop the scheduled service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[scheduled-trial-manager] Service stopped');
    }
  }

  /**
   * Run trial management manually
   */
  async runTrialManagement(): Promise<void> {
    try {
      console.log('[scheduled-trial-manager] Running trial management cycle...');
      await this.trialService.runTrialManagement();
      console.log('[scheduled-trial-manager] Trial management cycle completed');
    } catch (error) {
      console.error('[scheduled-trial-manager] Error in trial management cycle:', error);
    }
  }

  /**
   * Get trial statistics for admin dashboard
   */
  async getTrialStatistics() {
    return this.trialService.getTrialStatistics();
  }

  /**
   * Get the service status
   */
  getStatus(): { running: boolean; intervalMinutes: number } {
    return {
      running: this.intervalId !== null,
      intervalMinutes: this.CHECK_INTERVAL / 60000,
    };
  }
}

// Export singleton instance
export const scheduledTrialManager = new ScheduledTrialManager();