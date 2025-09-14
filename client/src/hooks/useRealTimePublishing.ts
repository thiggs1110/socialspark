import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

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

export interface UseRealTimePublishingOptions {
  businessId?: string;
  onStatusUpdate?: (update: PublishingStatusUpdate) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export interface UseRealTimePublishingReturn {
  isConnected: boolean;
  latestUpdate: PublishingStatusUpdate | null;
  statusHistory: PublishingStatusUpdate[];
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  connect: () => void;
  disconnect: () => void;
  clearHistory: () => void;
}

export function useRealTimePublishing(options: UseRealTimePublishingOptions = {}): UseRealTimePublishingReturn {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState<PublishingStatusUpdate | null>(null);
  const [statusHistory, setStatusHistory] = useState<PublishingStatusUpdate[]>([]);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const reconnectAttemptsRef = useRef(0);

  const connect = () => {
    if (!isAuthenticated || !user || !options.businessId) {
      console.log('[realtime] Cannot connect: not authenticated or missing business ID');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[realtime] Already connected');
      return;
    }

    setConnectionState('connecting');
    
    try {
      // Get auth token from localStorage or session
      const token = localStorage.getItem('auth-token') || 'mock-token'; // In development, use mock token
      
      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/publishing-status?token=${encodeURIComponent(token)}&businessId=${encodeURIComponent(options.businessId)}`;
      
      console.log('[realtime] Connecting to:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[realtime] Connected to publishing status updates');
        setIsConnected(true);
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
        options.onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const update: PublishingStatusUpdate = JSON.parse(event.data);
          console.log('[realtime] Received status update:', update);
          
          setLatestUpdate(update);
          setStatusHistory(prev => [...prev, update].slice(-50)); // Keep last 50 updates
          
          options.onStatusUpdate?.(update);
        } catch (error) {
          console.error('[realtime] Error parsing status update:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('[realtime] Connection closed:', event.code, event.reason);
        setIsConnected(false);
        setConnectionState('disconnected');
        options.onDisconnect?.();
        
        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Exponential backoff, max 30s
          console.log(`[realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[realtime] WebSocket error:', error);
        setConnectionState('error');
        options.onError?.(error);
      };

    } catch (error) {
      console.error('[realtime] Error creating WebSocket connection:', error);
      setConnectionState('error');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionState('disconnected');
    reconnectAttemptsRef.current = 0;
  };

  const clearHistory = () => {
    setStatusHistory([]);
    setLatestUpdate(null);
  };

  // Auto-connect when authenticated and business ID is available
  useEffect(() => {
    if (isAuthenticated && user && options.businessId) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [isAuthenticated, user, options.businessId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    latestUpdate,
    statusHistory,
    connectionState,
    connect,
    disconnect,
    clearHistory
  };
}

// Hook for tracking specific content publishing status
export function useContentPublishingStatus(contentId: string, businessId?: string) {
  const [contentUpdates, setContentUpdates] = useState<PublishingStatusUpdate[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishingProgress, setPublishingProgress] = useState(0);
  const [publishingError, setPublishingError] = useState<string | null>(null);

  const { latestUpdate, isConnected } = useRealTimePublishing({
    businessId,
    onStatusUpdate: (update) => {
      if (update.contentId === contentId) {
        setContentUpdates(prev => [...prev, update]);
        
        // Update publishing state based on update type and status
        if (update.type === 'publishing' && update.status === 'started') {
          setIsPublishing(true);
          setPublishingError(null);
        }
        
        if (update.progress !== undefined) {
          setPublishingProgress(update.progress);
        }
        
        if (update.type === 'completed' || update.type === 'error') {
          setIsPublishing(false);
          if (update.type === 'error') {
            setPublishingError(update.message);
          }
        }
      }
    }
  });

  const clearContentStatus = () => {
    setContentUpdates([]);
    setIsPublishing(false);
    setPublishingProgress(0);
    setPublishingError(null);
  };

  return {
    contentUpdates,
    isPublishing,
    publishingProgress,
    publishingError,
    isConnected,
    latestUpdate: contentUpdates[contentUpdates.length - 1] || null,
    clearContentStatus
  };
}