import React, { useState, useEffect, useRef, useCallback } from "react";
import { FiSend, FiCopy, FiWifi, FiWifiOff } from "react-icons/fi";
import { toast } from "react-toastify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useWebSocketContext } from "../../contexts/WebSocketContext";

const CodeBlock = ({ language, value }) => (
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

const Message = ({ message, isUser }) => (
  <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
    <div className={isUser ? "message message-user" : "message message-bot"}>
      {isUser ? (
        <p className="whitespace-pre-wrap">{message.content}</p>
      ) : (
        <div className="message-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={markdownComponents}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  </div>
);

const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    if (inline) {
      return (
        <code
          style={{
            backgroundColor: '#f0f0f0',
            padding: '2px 4px',
            borderRadius: '4px',
          }}
          {...props}
        >
          {children}
        </code>
      );
    } else {
      return (
        <pre
          style={{
            backgroundColor: '#f0f0f0',
            padding: '10px',
            borderRadius: '4px',
            overflowX: 'auto',
          }}
        >
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    }
  },
};

const StreamingMessage = ({ content }) => (
  <div className="flex justify-start mb-4">
    <div className="message message-bot">
      <div className="message-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={markdownComponents}
        >
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
const ChatInterface = ({ conversation, isLLMSelected }) => {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  // Local messages state initialized from conversation prop.
  const [localMessages, setLocalMessages] = useState(conversation?.messages || []);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  // Use a ref to always have the latest streaming content.
  const streamingContentRef = useRef("");
  const [streamingContent, setStreamingContent] = useState("");
  
  const { isConnected, sendPrompt, subscribeToConversation } = useWebSocketContext();

  useEffect(() => {
    if (conversation) {
      setLocalMessages(conversation.messages || []);
    }
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, streamingContent]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);
  
  const handleNewAssistantMessage = useCallback((content) => {
    const newMessage = {
      id: Date.now(),
      role: "assistant",
      content,
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, newMessage]);
  }, []);
  
  // Subscribe to WebSocket messages for the current conversation.
  useEffect(() => {
    if (!conversation?.id) return;
    
    const unsubscribe = subscribeToConversation(conversation.id, (data) => {
      if (data.type === "stream") {
        setIsStreaming(true);
        // Update both state and ref.
        setStreamingContent((prev) => {
          const newContent = prev + (data.content || "");
          streamingContentRef.current = newContent;
          return newContent;
        });
      } else if (data.type === "complete") {
        setIsStreaming(false);
        // Use the ref to capture the complete streaming content.
        const finalContent = streamingContentRef.current;
        handleNewAssistantMessage(finalContent);
        setStreamingContent("");
        streamingContentRef.current = "";
        setIsTyping(false);
      }
    });
    
    return () => unsubscribe();
  }, [conversation?.id, subscribeToConversation, handleNewAssistantMessage]);
  
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
    if (isStreaming) {
      toast.info("Please wait for the current response to complete");
      return;
    }

    const message = input.trim();
    setInput("");
    setIsTyping(true);
    // Add the user's message optimistically.
    const userMessage = {
      id: Date.now(),
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, userMessage]);
    
    try {
      if (isConnected) {
        await sendPrompt(conversation.id, message);
      } else {
        toast.error("WebSocket disconnected. Please try again later.");
        setIsTyping(false);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-container">
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

      <div className="messages-container">
        {localMessages.length === 0 ? (
          <div className="start-message">
            <p>Start a conversation</p>
            <p>
              Type a message below to start chatting with the selected LLM.
            </p>
          </div>
        ) : (
          localMessages.map((msg, index) => (
            <Message key={msg.id || `msg-${index}`} message={msg} isUser={msg.role === "user"} />
          ))
        )}

        {isStreaming && streamingContent && (
          <StreamingMessage content={streamingContent} />
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <form onSubmit={handleSubmit} className="message-input">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              conversation
                ? "Type your message here... (Enter to send, Shift+Enter for new line)"
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
            onClick={handleSubmit}
          >
            <FiSend size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
