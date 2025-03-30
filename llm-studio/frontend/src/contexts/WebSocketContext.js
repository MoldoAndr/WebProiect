// frontend/src/contexts/WebSocketContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';

// Create context
const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const {
    isConnected,
    error,
    sendMessage,
    addMessageListener,
    reconnect
  } = useWebSocket();
  
  const [messageListeners, setMessageListeners] = useState({});
  const [conversationStreams, setConversationStreams] = useState({});
  
  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!isConnected) return;
    
    const removeListener = addMessageListener((data) => {
      // Handle specific message types
      if (data.type === 'pong') {
        // Ping/pong keep-alive, no action needed
        return;
      }
      
      if (data.type === 'error') {
        toast.error(data.error || 'An error occurred');
        return;
      }
      
      if (data.type === 'stream' && data.conversation_id) {
        // Handle streaming response chunk
        setConversationStreams(prev => {
          const existing = prev[data.conversation_id] || '';
          return {
            ...prev,
            [data.conversation_id]: existing + (data.content || '')
          };
        });
        
        // Notify listeners for this conversation
        if (messageListeners[data.conversation_id]) {
          messageListeners[data.conversation_id].forEach(callback => {
            try {
              callback({
                type: 'stream',
                content: data.content,
                conversationId: data.conversation_id
              });
            } catch (err) {
              console.error('Error in stream listener callback:', err);
            }
          });
        }
        
        return;
      }
      
      if (data.type === 'complete' && data.conversation_id) {
        // Handle completion of a stream
        if (messageListeners[data.conversation_id]) {
          messageListeners[data.conversation_id].forEach(callback => {
            try {
              callback({
                type: 'complete',
                conversationId: data.conversation_id,
                content: conversationStreams[data.conversation_id] || ''
              });
            } catch (err) {
              console.error('Error in complete listener callback:', err);
            }
          });
        }
        
        return;
      }
      
      // Handle other message types through global listeners
      if (messageListeners['global']) {
        messageListeners['global'].forEach(callback => {
          try {
            callback(data);
          } catch (err) {
            console.error('Error in global listener callback:', err);
          }
        });
      }
    });
    
    return () => removeListener();
  }, [isConnected, addMessageListener, messageListeners, conversationStreams]);
  
  // Display WebSocket errors
  useEffect(() => {
    if (error) {
      toast.error(`WebSocket Error: ${error}`);
    }
  }, [error]);
  
  // Force reconnect on authentication change
  useEffect(() => {
    if (isAuthenticated) {
      reconnect();
    }
  }, [isAuthenticated, reconnect]);
  
  // Function to subscribe to a specific conversation's messages
  const subscribeToConversation = useCallback((conversationId, callback) => {
    setMessageListeners(prev => {
      const conversationListeners = prev[conversationId] || [];
      return {
        ...prev,
        [conversationId]: [...conversationListeners, callback]
      };
    });
    
    // Return unsubscribe function
    return () => {
      setMessageListeners(prev => {
        const conversationListeners = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: conversationListeners.filter(cb => cb !== callback)
        };
      });
    };
  }, []);
  
  // Function to subscribe to all messages
  const subscribeToAll = useCallback((callback) => {
    setMessageListeners(prev => {
      const globalListeners = prev['global'] || [];
      return {
        ...prev,
        'global': [...globalListeners, callback]
      };
    });
    
    // Return unsubscribe function
    return () => {
      setMessageListeners(prev => {
        const globalListeners = prev['global'] || [];
        return {
          ...prev,
          'global': globalListeners.filter(cb => cb !== callback)
        };
      });
    };
  }, []);
  
  const createConversation = useCallback((modelId, conversationId = null) => {
    return sendMessage({
      type: 'conversation_create',
      model_id: modelId,
      conversation_id: conversationId
    });
  }, [sendMessage]);
  
  const sendPrompt = useCallback((conversationId, prompt) => {
    setConversationStreams(prev => ({
      ...prev,
      [conversationId]: ''
    }));
    return sendMessage({
      type: 'prompt',
      conversation_id: conversationId,
      prompt: prompt
    });
  }, [sendMessage]);
  
  const contextValue = {
    isConnected,
    error,
    subscribeToConversation,
    subscribeToAll,
    createConversation,
    sendPrompt,
    getStreamContent: (conversationId) => conversationStreams[conversationId] || ''
  };
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};
