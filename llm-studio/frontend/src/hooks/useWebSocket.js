// frontend/src/hooks/useWebSocket.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

const WEBSOCKET_RETRY_DELAY = 5000;
const PING_INTERVAL = 60000;

export function useWebSocket() {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [messageQueue, setMessageQueue] = useState([]);
  const webSocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  
  // Use secure WebSocket based on current protocol
  const getWebSocketUrl = useCallback(() => {
    // Get the base URL - handle both development and production
    let protocol, baseUrl;
    
    // Check if we're in development mode (running on localhost with a port)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      baseUrl = `${protocol}//${window.location.host}`;
    } else {
      // In production, we want to use the same protocol as the current page
      protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      baseUrl = `${protocol}//${window.location.host}`;
    }
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // Try different WebSocket endpoints in case one fails
    // First try the standard `/ws` endpoint
    return `${baseUrl}/ws?token=${encodeURIComponent(token)}`;
  }, []);
  
  // Alternative WebSocket URL as backup
  const getAlternativeWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const baseUrl = `${protocol}//${window.location.host}`;
    const token = localStorage.getItem('token');
    
    // Try the backend/ws endpoint for direct access
    return `${baseUrl}/backend/ws?token=${encodeURIComponent(token)}`;
  }, []);
  
  const connect = useCallback(() => {
    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Only attempt connection if authenticated
    if (!isAuthenticated) {
      return;
    }
    
    // Close existing connection if any
    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }
    
    // First try the main WebSocket URL
    const tryMainUrl = () => {
      try {
        const url = getWebSocketUrl();
        console.log('Connecting to WebSocket:', url);
        
        const ws = new WebSocket(url);
        webSocketRef.current = ws;
        
        setupWebSocket(ws);
      } catch (err) {
        console.error('Error setting up WebSocket with main URL:', err);
        setError(`Main URL connection failed: ${err.message}`);
        
        // Try the alternative URL
        tryAlternativeUrl();
      }
    };
    
    const tryAlternativeUrl = () => {
      try {
        const url = getAlternativeWebSocketUrl();
        console.log('Connecting to alternative WebSocket URL:', url);
        
        const ws = new WebSocket(url);
        webSocketRef.current = ws;
        
        setupWebSocket(ws);
      } catch (err) {
        console.error('Error setting up WebSocket with alternative URL:', err);
        setError(`Failed to connect: ${err.message}`);
        
        // Attempt to reconnect after delay
        reconnectTimeoutRef.current = setTimeout(connect, WEBSOCKET_RETRY_DELAY);
      }
    };
    
    // Setup WebSocket event handlers
    const setupWebSocket = (ws) => {
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        
        // Process any queued messages
        if (messageQueue.length > 0) {
          messageQueue.forEach(message => {
            ws.send(JSON.stringify(message));
          });
          setMessageQueue([]);
        }
        
        // Set up ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL);
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Attempt to reconnect unless this was a clean closure
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(connect, WEBSOCKET_RETRY_DELAY);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
      };
    };
    
    // Start connection attempt
    tryMainUrl();
    
  }, [isAuthenticated, getWebSocketUrl, getAlternativeWebSocketUrl, messageQueue]);
  
  useEffect(() => {
    // Attempt to connect when authenticated
    if (isAuthenticated) {
      connect();
    }
    
    // Clean up on unmount
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
        webSocketRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, connect]);
  
  const sendMessage = useCallback((message) => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify(message));
      return true;
    } else {
      // Queue message for when connection is established
      setMessageQueue(prev => [...prev, message]);
      
      // Try to reconnect if not already connected
      if (!isConnected) {
        connect();
      }
      return false;
    }
  }, [isConnected, connect]);
  
  const addMessageListener = useCallback((callback) => {
    if (!webSocketRef.current) {
      return () => {};
    }
    
    const handler = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (err) {
        console.error('Error parsing WebSocket message:', err, event.data);
      }
    };
    
    webSocketRef.current.addEventListener('message', handler);
    
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.removeEventListener('message', handler);
      }
    };
  }, []);
  
  return {
    isConnected,
    error,
    sendMessage,
    addMessageListener,
    reconnect: connect
  };
}
