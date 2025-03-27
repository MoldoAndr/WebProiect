// frontend/src/hooks/useWebSocket.js

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

const WEBSOCKET_RETRY_DELAY = 5000;
const PING_INTERVAL = 60000;

// New constant: how long to wait after authentication
const WS_STARTUP_DELAY = 10000;

export function useWebSocket() {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [messageQueue, setMessageQueue] = useState([]);
  const webSocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const delayedStartupTimerRef = useRef(null); // <--- We'll store our 10s timer

  const getWebSocketUrl = useCallback(() => {
    let protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let baseUrl = `${protocol}//${window.location.host}`;
    // If you store the token as 'token' or 'access_token', be consistent
    const token = localStorage.getItem('token') || '';
    return `${baseUrl}/ws?token=${encodeURIComponent(token)}`;
  }, []);

  // Example "alternative" fallback, though you may not actually need it
  const getAlternativeWebSocketUrl = useCallback(() => {
    let protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let baseUrl = `${protocol}//${window.location.host}`;
    const token = localStorage.getItem('token') || '';
    return `${baseUrl}/backend/ws?token=${encodeURIComponent(token)}`;
  }, []);

  // ---------------------------
  // 1) Core connect function
  // ---------------------------
  const connect = useCallback(() => {
    // Clear any existing reconnection timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (!isAuthenticated) return;

    // Close existing connection if any
    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }

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

    // ---------------------------
    // 2) Setup WS event handlers
    // ---------------------------
    const setupWebSocket = (ws) => {
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);

        // Send any queued messages
        if (messageQueue.length > 0) {
          messageQueue.forEach(msg => {
            ws.send(JSON.stringify(msg));
          });
          setMessageQueue([]);
        }

        // Keep connection alive with periodic pings
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

        // Attempt to reconnect unless this was a clean closure (1000)
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(connect, WEBSOCKET_RETRY_DELAY);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('WebSocket connection error');
      };
    };

    // Actually start the connection attempt
    tryMainUrl();
  }, [
    isAuthenticated,
    getWebSocketUrl,
    getAlternativeWebSocketUrl,
    messageQueue
  ]);

  // -------------------------------------------------------
  // 3) Delay the initial connect by 10 seconds if desired
  // -------------------------------------------------------
  useEffect(() => {
    if (isAuthenticated) {
      // Wait 10s after isAuthenticated becomes true
      delayedStartupTimerRef.current = setTimeout(() => {
        connect();
      }, WS_STARTUP_DELAY);
    }

    // Cleanup if user logs out or component unmounts
    return () => {
      if (delayedStartupTimerRef.current) {
        clearTimeout(delayedStartupTimerRef.current);
        delayedStartupTimerRef.current = null;
      }
    };
  }, [isAuthenticated, connect]);

  // Cleanup entire hook on unmount (close WebSocket, etc.)
  useEffect(() => {
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
      if (delayedStartupTimerRef.current) {
        clearTimeout(delayedStartupTimerRef.current);
        delayedStartupTimerRef.current = null;
      }
    };
  }, []);

  // Send messages, or queue them if not open yet
  const sendMessage = useCallback((message) => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify(message));
      return true;
    } else {
      // Queue message until connection is open
      setMessageQueue(prev => [...prev, message]);

      // Trigger a reconnect if not connected
      if (!isConnected) {
        connect();
      }
      return false;
    }
  }, [isConnected, connect]);

  // Listen for messages
  const addMessageListener = useCallback((callback) => {
    if (!webSocketRef.current) {
      return () => {};
    }

    const handler = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (err) {
        console.error('Failed to parse incoming message', err);
      }
    };

    webSocketRef.current.addEventListener('message', handler);

    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.removeEventListener('message', handler);
      }
    };
  }, []);

  // Return needed things from your hook
  return {
    isConnected,
    error,
    sendMessage,
    addMessageListener,
    reconnect: connect,
  };
}
