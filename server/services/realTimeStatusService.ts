import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';

export interface PublishingStatusUpdate {
  contentId: string;
  businessId: string;
  type: 'validation' | 'formatting' | 'publishing' | 'completed' | 'error';
  platform?: string;
  status: 'started' | 'in_progress' | 'success' | 'warning' | 'error' | 'completed';
  message: string;
  details?: any;
  timestamp: string;
  progress?: number; // 0-100
}

export interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  businessId: string;
}

export class RealTimeStatusService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient[]> = new Map(); // businessId -> clients
  private static instance: RealTimeStatusService;

  static getInstance(): RealTimeStatusService {
    if (!RealTimeStatusService.instance) {
      RealTimeStatusService.instance = new RealTimeStatusService();
    }
    return RealTimeStatusService.instance;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/publishing-status'
    });

    this.wss.on('connection', async (ws, request) => {
      try {
        // Extract authentication from URL query or headers
        const url = new URL(request.url!, `http://${request.headers.host}`);
        const token = url.searchParams.get('token') || request.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          ws.close(1008, 'Authentication required');
          return;
        }

        // Verify authentication token
        const user = await this.verifyWebSocketAuth(token);
        if (!user) {
          ws.close(1008, 'Invalid authentication');
          return;
        }

        // Get business ID for the user
        const businessId = url.searchParams.get('businessId');
        if (!businessId) {
          ws.close(1008, 'Business ID required');
          return;
        }

        // Register client
        const client: ConnectedClient = {
          ws,
          userId: user.id,
          businessId
        };

        this.addClient(businessId, client);
        console.log(`[realtime] Client connected for business ${businessId}`);

        // Send connection confirmation
        this.sendToClient(client, {
          contentId: '',
          businessId,
          type: 'completed',
          status: 'success',
          message: 'Connected to real-time publishing status',
          timestamp: new Date().toISOString()
        });

        // Handle client disconnect
        ws.on('close', () => {
          this.removeClient(businessId, client);
          console.log(`[realtime] Client disconnected for business ${businessId}`);
        });

        // Handle client errors
        ws.on('error', (error) => {
          console.error(`[realtime] WebSocket error for business ${businessId}:`, error);
          this.removeClient(businessId, client);
        });

      } catch (error) {
        console.error('[realtime] Error handling WebSocket connection:', error);
        ws.close(1011, 'Internal server error');
      }
    });

    console.log('[realtime] WebSocket server initialized on /ws/publishing-status');
  }

  /**
   * Verify WebSocket authentication
   */
  private async verifyWebSocketAuth(token: string): Promise<any> {
    try {
      // This would integrate with your existing auth system
      // For now, return a mock user - in production, verify the actual token
      return { id: 'user123' }; // Mock user for development
    } catch (error) {
      console.error('[realtime] Auth verification failed:', error);
      return null;
    }
  }

  /**
   * Add client to business group
   */
  private addClient(businessId: string, client: ConnectedClient): void {
    if (!this.clients.has(businessId)) {
      this.clients.set(businessId, []);
    }
    this.clients.get(businessId)!.push(client);
  }

  /**
   * Remove client from business group
   */
  private removeClient(businessId: string, client: ConnectedClient): void {
    const businessClients = this.clients.get(businessId);
    if (businessClients) {
      const index = businessClients.indexOf(client);
      if (index !== -1) {
        businessClients.splice(index, 1);
      }
      if (businessClients.length === 0) {
        this.clients.delete(businessId);
      }
    }
  }

  /**
   * Send status update to all clients of a business
   */
  broadcastToBusinessClients(businessId: string, update: PublishingStatusUpdate): void {
    const clients = this.clients.get(businessId);
    if (!clients || clients.length === 0) {
      return;
    }

    const message = JSON.stringify(update);
    
    clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(message);
        } catch (error) {
          console.error(`[realtime] Error sending message to client:`, error);
          this.removeClient(businessId, client);
        }
      }
    });
  }

  /**
   * Send message to specific client
   */
  private sendToClient(client: ConnectedClient, update: PublishingStatusUpdate): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(update));
      } catch (error) {
        console.error(`[realtime] Error sending message to client:`, error);
      }
    }
  }

  /**
   * Send publishing validation status
   */
  sendValidationStatus(businessId: string, contentId: string, platform: string, isValid: boolean, errors: string[], warnings: string[]): void {
    const status = isValid ? 'success' : 'error';
    const message = isValid 
      ? `Content validated successfully for ${platform}` 
      : `Validation failed for ${platform}: ${errors.join(', ')}`;

    this.broadcastToBusinessClients(businessId, {
      contentId,
      businessId,
      type: 'validation',
      platform,
      status,
      message,
      details: { errors, warnings },
      timestamp: new Date().toISOString(),
      progress: isValid ? 25 : 0
    });
  }

  /**
   * Send content formatting status
   */
  sendFormattingStatus(businessId: string, contentId: string, platform: string, success: boolean, warnings: string[]): void {
    const status = success ? 'success' : 'warning';
    const message = success 
      ? `Content formatted for ${platform}` 
      : `Content formatting had issues for ${platform}`;

    this.broadcastToBusinessClients(businessId, {
      contentId,
      businessId,
      type: 'formatting',
      platform,
      status,
      message,
      details: { warnings },
      timestamp: new Date().toISOString(),
      progress: 50
    });
  }

  /**
   * Send publishing status
   */
  sendPublishingStatus(businessId: string, contentId: string, platform: string, status: 'started' | 'success' | 'error', message: string, details?: any): void {
    let progress = 75;
    if (status === 'started') progress = 60;
    if (status === 'success') progress = 100;
    if (status === 'error') progress = 0;

    this.broadcastToBusinessClients(businessId, {
      contentId,
      businessId,
      type: 'publishing',
      platform,
      status,
      message,
      details,
      timestamp: new Date().toISOString(),
      progress
    });
  }

  /**
   * Send completion status
   */
  sendCompletionStatus(businessId: string, contentId: string, success: boolean, platforms: string[], results: any): void {
    const status = success ? 'success' : 'error';
    const message = success 
      ? `Content published successfully to ${platforms.join(', ')}` 
      : `Publishing failed for some platforms`;

    this.broadcastToBusinessClients(businessId, {
      contentId,
      businessId,
      type: 'completed',
      status,
      message,
      details: { platforms, results },
      timestamp: new Date().toISOString(),
      progress: 100
    });
  }

  /**
   * Send error status
   */
  sendErrorStatus(businessId: string, contentId: string, platform: string | undefined, error: string, details?: any): void {
    this.broadcastToBusinessClients(businessId, {
      contentId,
      businessId,
      type: 'error',
      platform,
      status: 'error',
      message: error,
      details,
      timestamp: new Date().toISOString(),
      progress: 0
    });
  }

  /**
   * Get connected clients count for a business
   */
  getConnectedClientsCount(businessId: string): number {
    return this.clients.get(businessId)?.length || 0;
  }

  /**
   * Get all connected businesses
   */
  getConnectedBusinesses(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.wss) {
      this.wss.close();
      this.clients.clear();
      console.log('[realtime] WebSocket server shut down');
    }
  }
}

// Export singleton instance
export const realTimeStatusService = RealTimeStatusService.getInstance();