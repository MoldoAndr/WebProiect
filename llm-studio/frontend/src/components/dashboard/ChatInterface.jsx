import React, { useState, useEffect, useRef, useCallback } from "react";
import { FiSend, FiCopy, FiThumbsUp, FiThumbsDown, FiClock, FiWifi, FiWifiOff } from "react-icons/fi";
import { toast } from "react-toastify";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useWebSocketContext } from "../../contexts/WebSocketContext";

const CodeBlock = ({ language, value }) => {
  return (
    <div className="relative">
      <div className="absolute right-2 top-2">
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success("Code copied to clipboard");
          }}
          className="copy-button"
          aria-label="Copy code"
        >
          <FiCopy size={14} />
        </button>
      </div>
      <SyntaxHighlighter language={language || "text"} style={atomDark}>
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");

    return !inline && match ? (
      <CodeBlock
        language={match[1]}
        value={String(children).replace(/\n$/, "")}
      />
    ) : (
      <code className={`bg-gray-700 px-1 rounded ${className}`} {...props}>
        {children}
      </code>
    );
  },
};

const Message = ({ message, isUser, isStreaming = false }) => {
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={isUser ? "message message-user" : "message message-bot"}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="message-content">
            <ReactMarkdown components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="streaming-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const StreamingMessage = ({ content, conversationId }) => {
  return (
    <div className="flex justify-start mb-4">
      <div className="message message-bot">
        <div className="message-content">
          <ReactMarkdown components={markdownComponents}>
            {content || ""}
          </ReactMarkdown>
          <span className="streaming-indicator">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </span>
        </div>
      </div>
    </div>
  );
};

const ChatInterface = ({ conversation, onSendMessage, isLLMSelected }) => {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  const { isConnected, sendPrompt, subscribeToConversation, getStreamContent } = useWebSocketContext();

  const messages = conversation?.messages || [];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);
  
  // Subscribe to WebSocket messages for the current conversation
  useEffect(() => {
    if (!conversation?.id) return;
    
    const unsubscribe = subscribeToConversation(conversation.id, (data) => {
      if (data.type === 'stream') {
        setIsStreaming(true);
        setStreamingContent(prev => prev + (data.content || ''));
      } else if (data.type === 'complete') {
        setIsStreaming(false);
        setStreamingContent('');
        setIsTyping(false);
      }
    });
    
    return () => unsubscribe();
  }, [conversation?.id, subscribeToConversation]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!input.trim()) return;
    if (!isLLMSelected) {
      toast.error("Please select an LLM model first");
      return;
    }
    
    if (!conversation?.id) {
      toast.error("No active conversation");
      return;
    }

    // Don't send if we're already streaming
    if (isStreaming) {
      toast.info("Please wait for the current response to complete");
      return;
    }

    // Clear input and set typing indicator
    const message = input.trim();
    setInput("");
    setIsTyping(true);
    setStreamingContent("");

    try {
      // First add the user message to the UI immediately
      await onSendMessage(message);
      
      // Then send through WebSocket for streaming response
      if (isConnected) {
        sendPrompt(conversation.id, message);
      } else {
        // Fallback to regular API if WebSocket is not connected
        toast.warning("Using non-streaming mode - WebSocket disconnected");
        await onSendMessage(message, true);
        setIsTyping(false);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter, but allow Shift+Enter for new lines
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFeedback = (messageId, isPositive) => {
    toast.success(`Thanks for your ${isPositive ? 'positive' : 'negative'} feedback!`);
    // Implement feedback submission to API here
  };

  return (
    <div className="chat-container">
      {/* WebSocket Connection Status */}
      <div className="websocket-status">
        {isConnected ? (
          <span className="ws-connected">
            <FiWifi /> Connected
          </span>
        ) : (
          <span className="ws-disconnected">
            <FiWifiOff /> Disconnected
          </span>
        )}
      </div>

      {/* Messages area */}
      <div className="messages-container">
        {conversation ? (
          <>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-lg mb-2">Start a conversation</p>
                <p className="text-sm text-center max-w-md">
                  Type a message below to start chatting with the selected LLM.
                </p>
              </div>
            ) : (
              // Render all messages in the conversation
              messages.map((message, index) => (
                <Message
                  key={message.id || `msg-${index}`}
                  message={message}
                  isUser={message.role === "user"}
                />
              ))
            )}

            {/* Streaming message if active */}
            {isStreaming && streamingContent && (
              <StreamingMessage 
                content={streamingContent} 
                conversationId={conversation.id} 
              />
            )}

            {/* Typing indicator (for non-streaming responses) */}
            {isTyping && !isStreaming && (
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            )}

            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="text-lg mb-2">No conversation selected</p>
            <p className="text-sm text-center max-w-md">
              Select a conversation from the sidebar or create a new one to get
              started.
            </p>
          </div>
        )}
      </div>

      {/* Floating input area */}
      <div className="input-container">
        <form onSubmit={handleSubmit} className="message-input">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              conversation
                ? "Type your message here... (Press Enter to send, Shift+Enter for new line)"
                : "Select or create a conversation to start chatting"
            }
            disabled={!conversation || isTyping}
            rows="1"
          />
          <button
            type="submit"
            className="send-button"
            disabled={!conversation || !input.trim() || isTyping}
            aria-label="Send message"
          >
            <FiSend size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
