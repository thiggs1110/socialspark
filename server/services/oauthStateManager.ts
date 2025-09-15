import { storage } from '../storage';

export interface OAuthState {
  businessId: string;
  platform: string;
  nonce: string;
  createdAt: Date;
  codeVerifier?: string; // For Twitter PKCE
}

// In-memory state storage (in production, use Redis)
const oauthStates = new Map<string, OAuthState>();

export class OAuthStateManager {
  /**
   * Generate secure OAuth state with CSRF protection
   */
  static async generateState(businessId: string, platform: string, codeVerifier?: string): Promise<string> {
    const nonce = await this.generateNonce();
    const stateId = await this.generateNonce();
    
    const state: OAuthState = {
      businessId,
      platform,
      nonce,
      createdAt: new Date(),
      codeVerifier
    };

    oauthStates.set(stateId, state);
    
    // Cleanup old states (older than 10 minutes)
    this.cleanupExpiredStates();
    
    return stateId;
  }

  /**
   * Validate and retrieve OAuth state
   */
  static validateState(stateId: string): OAuthState | null {
    const state = oauthStates.get(stateId);
    
    if (!state) {
      return null;
    }

    // Check if state is expired (10 minutes)
    const expirationTime = new Date(state.createdAt.getTime() + 10 * 60 * 1000);
    if (new Date() > expirationTime) {
      oauthStates.delete(stateId);
      return null;
    }

    return state;
  }

  /**
   * Consume OAuth state (one-time use)
   */
  static consumeState(stateId: string): OAuthState | null {
    const state = this.validateState(stateId);
    if (state) {
      oauthStates.delete(stateId);
    }
    return state;
  }

  /**
   * Generate cryptographically secure nonce
   */
  private static async generateNonce(): Promise<string> {
    const crypto = await import('crypto');
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Clean up expired states
   */
  private static cleanupExpiredStates(): void {
    const now = new Date();
    const expirationThreshold = 10 * 60 * 1000; // 10 minutes

    for (const [stateId, state] of Array.from(oauthStates.entries())) {
      if (now.getTime() - state.createdAt.getTime() > expirationThreshold) {
        oauthStates.delete(stateId);
      }
    }
  }
}

export const oauthStateManager = OAuthStateManager;