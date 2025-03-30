import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

// Constants
const WEBSOCKET_RETRY_DELAY = 5000;
const MAX_RETRY_DELAY = 30000;
const PING_INTERVAL = 30000;
const INITIAL_CONNECT_DELAY = 1000;
const MAX_QUEUE_SIZE = 20;

export function useWebSocket() {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [messageQueue, setMessageQueue] = useState([]);
  
  const webSocketRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const retryAttemptsRef = useRef(0);
  const isMountedRef = useRef(false);

  // Get WebSocket URL with token
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem('token');
    return `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token || '')}`;
  }, []);

  // Cleanup all resources
  const cleanup = useCallback(() => {
    if (webSocketRef.current) {
      webSocketRef.current.onopen = null;
      webSocketRef.current.onclose = null;
      webSocketRef.current.onerror = null;
      webSocketRef.current.close(1000);
      webSocketRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // Handle WebSocket connection
  const connect = useCallback(() => {
    if (!isAuthenticated || !isMountedRef.current) return;
    
    cleanup(); // Cleanup any existing connection
    
    try {
      const url = getWebSocketUrl();
      const ws = new WebSocket(url);
      webSocketRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        retryAttemptsRef.current = 0;
        
        // Send queued messages
        if (messageQueue.length > 0) {
          const messagesToSend = [...messageQueue];
          setMessageQueue([]);
          messagesToSend.forEach(msg => {
            ws.send(JSON.stringify(msg));
          });
        }
        
        // Setup ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, PING_INTERVAL);
      };

      ws.onclose = (event) => {
        if (!isMountedRef.current) return;
        
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        cleanup();
        
        if (event.code !== 1000) { // Don't reconnect if closed normally
          const delay = Math.min(
            WEBSOCKET_RETRY_DELAY * Math.pow(2, retryAttemptsRef.current),
            MAX_RETRY_DELAY
          );
          retryAttemptsRef.current += 1;
          retryTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = (error) => {
        if (!isMountedRef.current) return;
        console.error('WebSocket error:', error);
        setError('Connection error');
      };

    } catch (err) {
      console.error('WebSocket setup error:', err);
      setError('Setup error');
      cleanup();
    }
  }, [isAuthenticated, getWebSocketUrl, messageQueue, cleanup]);

  // Send message or add to queue with logging
  const sendMessage = useCallback((message) => {
    // Log the conversation if available
    if (message && message.conversation_id) {
      console.log("Sending message for conversation:", message.conversation_id);
    } else {
      console.log("Sending message without conversation id:", message);
    }

    if (webSocketRef.current?.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify(message));
      return true;
    } else {
      setMessageQueue(prev => [...prev.slice(-MAX_QUEUE_SIZE), message]);
      if (!isConnected) {
        connect();
      }
      return false;
    }
  }, [isConnected, connect]);

  // Add message listener
  const addMessageListener = useCallback((callback) => {
    if (!webSocketRef.current) return () => {};
    
    const handler = (event) => {
      try {
        console.log("Received data:", event.data);
        const data = JSON.parse(event.data);
        if (data.type !== 'pong') {
          callback(data);
        }
      } catch (err) {
        console.error('Message parsing error:', err);
      }
    };
    
    webSocketRef.current.addEventListener('message', handler);
    return () => {
      webSocketRef.current?.removeEventListener('message', handler);
    };
  }, []);

  // Main effect for connection management
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial connection with delay
    const connectTimeout = setTimeout(() => {
      if (isAuthenticated && isMountedRef.current) {
        connect();
      }
    }, INITIAL_CONNECT_DELAY);
    
    return () => {
      isMountedRef.current = false;
      clearTimeout(connectTimeout);
      cleanup();
    };
  }, [isAuthenticated, connect, cleanup]);

  return {
    isConnected,
    error,
    sendMessage,
    addMessageListener,
    reconnect: connect,
    messageQueue,
  };
}
