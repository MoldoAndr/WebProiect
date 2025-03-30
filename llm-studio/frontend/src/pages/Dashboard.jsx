// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiPlus, FiMenu, FiX } from "react-icons/fi";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import ChatInterface from "../components/dashboard/ChatInterface";
import ConversationHistory from "../components/dashboard/ConversationHistory";
import LLMSelector from "../components/dashboard/LLMSelector";
import UserStats from "../components/dashboard/UserStats";
import { useAuth } from "../hooks/useAuth";
import { useWebSocketContext } from "../contexts/WebSocketContext";
import { llmApiService } from "../services/llmApi.service";
import "./Dashboard.css";

const mockUserStats = {
  totalConversations: 24,
  totalMessages: 128,
  favoriteModel: "GPT-4",
  averageResponseTime: 2.4,
};

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [availableLLMs, setAvailableLLMs] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [selectedLLM, setSelectedLLM] = useState(null);
  const [userStats, setUserStats] = useState(mockUserStats);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLLMs, setIsLoadingLLMs] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [error, setError] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    createConversation: wsCreateConversation,
    sendPrompt,
    isConnected: wsConnected,
  } = useWebSocketContext();

  const activeConversation = conversations.find(
    (conv) => conv.id === selectedConversationId
  );

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);

      await loadLLMs();
      await loadConversations();

      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  const loadLLMs = async () => {
    setIsLoadingLLMs(true);
    try {
      const llms = await llmApiService.getAllLLMs();
      console.log("Loaded LLMs:", llms);
      setAvailableLLMs(llms);
    } catch (error) {
      console.error("Error loading LLMs:", error);
      setError("Failed to load LLM models. Please try again later.");
      toast.error("Failed to load LLM models");
    } finally {
      setIsLoadingLLMs(false);
    }
  };

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const response = await fetch("/api/conversations", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
  
      if (!response.ok) {
        throw new Error(`Failed to load conversations: ${response.statusText}`);
      }
  
      const data = await response.json();
      console.log("Loaded conversations with messages:", data);
      setConversations(data);
  
      // Update user stats based on conversations and their messages
      const totalConversations = data.length;
      const totalMessages = data.reduce(
        (acc, conv) => acc + (conv.messages ? conv.messages.length : 0),
        0
      );
      setUserStats((prevStats) => ({
        ...prevStats,
        totalConversations,
        totalMessages,
      }));
    } catch (error) {
      console.error("Error loading conversations:", error);
      console.warn("Using mock conversation data");
      // Optionally, use fallback data here for development
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleCreateNewConversation = async () => {
    if (!selectedLLM) {
      toast.warning("Please select an LLM model first");
      return;
    }

    setIsLoading(true);
    try {
      const newConversation = await llmApiService.createConversation(
        selectedLLM.id
      );

      if (wsConnected) {
        wsCreateConversation(selectedLLM.id, newConversation.id);
      }

      // Option 1: Update local state immediately.
      setConversations([newConversation, ...conversations]);
      setSelectedConversationId(newConversation.id);

      toast.success("New conversation created");
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message, useRestApi = false) => {
    if (!selectedLLM) {
      toast.error("Please select an LLM model first");
      return;
    }
  
    if (!activeConversation) {
      toast.error("No active conversation");
      return;
    }
  
    console.log("Active conversation id:", activeConversation.id);
  
    const userMessage = {
      id: Date.now(), // Temporary ID for optimistic update
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };
  
    // Optimistically update UI using a functional update to ensure we have the latest state.
    setConversations((prevConversations) =>
      prevConversations.map((conv) => {
        if (conv.id === activeConversation.id + 1) {
          return {
            ...conv,
            messages: [...(conv.messages || []), userMessage],
            updated_at: new Date().toISOString(),
          };
        }
        return conv;
      })
    );
  
    try {
      if (useRestApi || !wsConnected) {
        // Use REST API to send the message
        const response = await llmApiService.sendMessage(activeConversation.id, message);
  
        const assistantMessage = {
          id: Date.now() + 1, // Temporary ID; note this value should not affect the conversation id
          role: "assistant",
          content: response.response,
          created_at: new Date().toISOString(),
        };
  
        // Update conversation using functional update.
        setConversations((prevConversations) =>
          prevConversations.map((conv) => {
            if (conv.id === activeConversation.id) {
              // If no messages existed before, use part of the user message as title.
              const newTitle =
                (conv.messages && conv.messages.length === 0)
                  ? message.substring(0, 30) + (message.length > 30 ? "..." : "")
                  : conv.title;
              return {
                ...conv,
                title: newTitle,
                messages: [...(conv.messages || []), assistantMessage],
                updated_at: new Date().toISOString(),
              };
            }
            return conv;
          })
        );
  
        // Update user stats
        setUserStats((prevStats) => ({
          ...prevStats,
          totalMessages: prevStats.totalMessages + 2,
        }));
  
        return;
      } else {
        // Use WebSocket streaming – ensure we use the correct activeConversation.id here
        await sendPrompt(activeConversation.id, message);
        return;
      }
    } catch (error) {
      console.error("Error getting LLM response:", error);
      toast.error("Failed to get response from LLM");
      return Promise.reject(error);
    }
  };
  

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="dashboard-container">
      <DashboardHeader user={user} />

      <div className="dashboard-content">
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
        <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <h2 className="sidebar-title">Conversations</h2>
          </div>
          <div className="sidebar-content">
            <button
              className="new-chat-button"
              onClick={handleCreateNewConversation}
              disabled={!selectedLLM || isLoading}
            >
              <FiPlus size={16} />
              <span>{isLoading ? "Creating..." : "New Chat"}</span>
            </button>

            <div className="sidebar-section">
              <h3 className="sidebar-section-title">LLM Selection</h3>
              {isLoadingLLMs ? (
                <div className="loading-indicator">Loading LLMs...</div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : (
                <LLMSelector
                  llms={availableLLMs}
                  selectedLLM={selectedLLM}
                  onLLMSelect={setSelectedLLM}
                />
              )}
            </div>

            <div className="history-container">
              {isLoadingConversations ? (
                <div className="loading-indicator">
                  Loading conversations...
                </div>
              ) : (
                <ConversationHistory
                  conversations={conversations}
                  selectedConversationId={selectedConversationId}
                  onConversationSelect={setSelectedConversationId}
                />
              )}
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-section-title">Your Activity</h3>
              <UserStats stats={userStats} />
            </div>
          </div>
        </div>
        <div className="main-content">
          {!selectedConversationId ? (
            <div className="empty-state">
              <div className="wave"></div>
              <div className="cube-container">
                <div className="outer-cube">
                  <div className="face front"></div>
                  <div className="face left"></div>
                  <div className="face right"></div>
                  <div className="face top"></div>
                  <div className="face bottom"></div>
                  <div className="face back"></div>
                </div>
                <div className="inner-cube">
                  <div className="face front"></div>
                  <div className="face left"></div>
                  <div className="face right"></div>
                  <div className="face top"></div>
                  <div className="face bottom"></div>
                  <div className="face back"></div>
                </div>
                <div className="wave"></div>
              </div>
              <h2 className="empty-state-title">Welcome to LLM Studio</h2>
              <p className="empty-state-description">
                {isLoadingLLMs
                  ? "Loading available LLM models..."
                  : availableLLMs.length > 0
                  ? "Select a conversation from the sidebar or create a new one to get started. Make sure to select an LLM model first."
                  : "No LLM models available. Please ask an administrator to configure LLM models."}
              </p>
              <button
                className="new-chat-button"
                onClick={handleCreateNewConversation}
                disabled={!selectedLLM || isLoading}
              >
                <FiPlus size={18} />
                <span>
                  {isLoading ? "Creating..." : "Start New Conversation"}
                </span>
              </button>
            </div>
          ) : (
            <ChatInterface
              conversation={activeConversation}
              onSendMessage={handleSendMessage}
              isLLMSelected={!!selectedLLM}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
