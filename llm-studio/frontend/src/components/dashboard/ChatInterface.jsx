// src/components/dashboard/ChatInterface.jsx
import React, { useState, useEffect, useRef } from "react";
import { FiSend, FiCopy, FiThumbsUp, FiThumbsDown } from "react-icons/fi";
import { toast } from "react-toastify";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// Custom renderer for code blocks
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

const Message = ({ message, isUser }) => {
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
          </div>
        )}
      </div>
    </div>
  );
};

const ChatInterface = ({ conversation, onSendMessage, isLLMSelected }) => {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const messages = conversation?.messages || [];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!input.trim()) return;
    if (!isLLMSelected) {
      toast.error("Please select an LLM model first");
      return;
    }

    // Clear input and set typing indicator
    setInput("");
    setIsTyping(true);

    // Send the message to the API
    onSendMessage(input).finally(() => {
      setIsTyping(false);
    });
  };

  const handleKeyDown = (e) => {
    // Submit on Enter, but allow Shift+Enter for new lines
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  return (
    <div className="chat-container">
      {/* Messages area */}
      <div className="messages-container">
        {conversation ? (
          <>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
               
              </div>
            ) : (
              messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  isUser={message.role === "user"}
                />
              ))
            )}

            {/* Typing indicator */}
            {isTyping && (
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
            disabled={!conversation}
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
