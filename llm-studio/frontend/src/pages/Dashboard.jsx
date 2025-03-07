// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiPlus,
  FiMessageSquare,
  FiSettings,
  FiMenu,
  FiX,
  FiSend,
  FiUser,
  FiLogOut,
  FiCpu,
  FiActivity,
} from "react-icons/fi";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import ChatInterface from "../components/dashboard/ChatInterface";
import ConversationHistory from "../components/dashboard/ConversationHistory";
import LLMSelector from "../components/dashboard/LLMSelector";
import UserStats from "../components/dashboard/UserStats";
import { useAuth } from "../hooks/useAuth";
import "./Dashboard.css";

// Mock data - would be replaced with real API calls
const mockLLMs = [
  {
    id: 1,
    name: "GPT-4",
    description: "Most capable model",
    tokenLimit: 8000,
    costPer1kTokens: "$0.08",
  },
  {
    id: 2,
    name: "Claude 3",
    description: "Balanced performance",
    tokenLimit: 100000,
    costPer1kTokens: "$0.07",
  },
  {
    id: 3,
    name: "Gemini Pro",
    description: "Google's multimodal model",
    tokenLimit: 12000,
    costPer1kTokens: "$0.06",
  },
  {
    id: 4,
    name: "Llama 3",
    description: "Open source option",
    tokenLimit: 10000,
    costPer1kTokens: "$0.01",
  },
  {
    id: 5,
    name: "Mistral Large",
    description: "Strong performance",
    tokenLimit: 32000,
    costPer1kTokens: "$0.05",
  },
];

const mockConversations = [
  {
    id: 1,
    title: "Project planning assistance",
    updated_at: "2023-06-15T10:30:00Z",
    messages: [
      {
        id: 1,
        role: "user",
        content: "Can you help me plan a software project timeline?",
        created_at: "2023-06-15T10:30:00Z",
      },
      {
        id: 2,
        role: "assistant",
        content:
          "I'd be happy to help you plan a software project timeline. To get started, could you tell me about:\n\n1. The scope of your project\n2. Available resources (team size, skills)\n3. Any hard deadlines\n4. Major features or milestones",
        created_at: "2023-06-15T10:30:30Z",
      },
    ],
  },
  {
    id: 2,
    title: "Code review help",
    updated_at: "2023-06-14T14:22:00Z",
    messages: [
      {
        id: 3,
        role: "user",
        content: "I need help optimizing this Python function",
        created_at: "2023-06-14T14:22:00Z",
      },
      {
        id: 4,
        role: "assistant",
        content:
          "I'd be glad to help optimize your Python function. Could you share the code you'd like me to review?",
        created_at: "2023-06-14T14:22:30Z",
      },
    ],
  },
  {
    id: 3,
    title: "Database design discussion",
    updated_at: "2023-06-12T09:15:00Z",
    messages: [
      {
        id: 5,
        role: "user",
        content:
          "What would be the best database structure for a social media app?",
        created_at: "2023-06-12T09:15:00Z",
      },
      {
        id: 6,
        role: "assistant",
        content:
          "For a social media application, you'll need a database design that handles user profiles, relationships between users, content posts, interactions, and more. Here's a high-level structure I would recommend...",
        created_at: "2023-06-12T09:15:45Z",
      },
    ],
  },
];

const mockUserStats = {
  totalConversations: 24,
  totalMessages: 128,
  favoriteModel: "GPT-4",
  averageResponseTime: 2.4,
};

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState(mockConversations);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [selectedLLM, setSelectedLLM] = useState(null);
  const [userStats, setUserStats] = useState(mockUserStats);
  const [isLoading, setIsLoading] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const activeConversation = conversations.find(
    (conv) => conv.id === selectedConversationId
  );

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data");
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handleCreateNewConversation = () => {
    if (!selectedLLM) {
      toast.warning("Please select an LLM model first");
      return;
    }

    const newConversation = {
      id: Date.now(), // In real app would be from API
      title: "New conversation",
      updated_at: new Date().toISOString(),
      messages: [],
      llmId: selectedLLM.id,
    };

    setConversations([newConversation, ...conversations]);
    setSelectedConversationId(newConversation.id);
    toast.success("New conversation created");
  };

  const handleSendMessage = async (message) => {
    if (!selectedLLM) {
      toast.error("Please select an LLM model first");
      return;
    }

    if (!activeConversation) {
      toast.error("No active conversation");
      return;
    }

    // Add user message to conversation
    const userMessage = {
      id: Date.now(),
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };

    // Optimistically update UI
    const updatedConversations = conversations.map((conv) => {
      if (conv.id === activeConversation.id) {
        return {
          ...conv,
          messages: [...conv.messages, userMessage],
          updated_at: new Date().toISOString(),
        };
      }
      return conv;
    });

    setConversations(updatedConversations);

    // Simulate API call to get LLM response
    try {
      // In real app, this would be an API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock LLM response
      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: `This is a simulated response from ${selectedLLM.name}. In a real application, this would be an actual response from the LLM API based on your message: "${message}"`,
        created_at: new Date().toISOString(),
      };

      // Update conversation with assistant response
      const finalUpdatedConversations = conversations.map((conv) => {
        if (conv.id === activeConversation.id) {
          const newTitle =
            conv.messages.length === 0
              ? message.substring(0, 30) + (message.length > 30 ? "..." : "")
              : conv.title;

          return {
            ...conv,
            title: newTitle,
            messages: [...conv.messages, userMessage, assistantMessage],
            updated_at: new Date().toISOString(),
          };
        }
        return conv;
      });

      setConversations(finalUpdatedConversations);

      // Update user stats
      setUserStats({
        ...userStats,
        totalMessages: userStats.totalMessages + 2, // +2 for user and assistant messages
      });
    } catch (error) {
      console.error("Error getting LLM response:", error);
      toast.error("Failed to get response from LLM");
    }

    return Promise.resolve();
  };

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    console.log("Toggling sidebar, new state:", newState);
    setSidebarOpen(newState);
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
            >
              <FiPlus size={16} />
              <span>New Chat</span>
            </button>

            <div className="sidebar-section">
              <h3 className="sidebar-section-title">LLM Selection</h3>
              <LLMSelector
                llms={mockLLMs}
                selectedLLM={selectedLLM}
                onLLMSelect={setSelectedLLM}
              />
            </div>

            <div className="history-container">
              <ConversationHistory
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                onConversationSelect={setSelectedConversationId}
              />
            </div>

            <div className="sidebar-section">
              <h3 className="sidebar-section-title">Your Activity</h3>
              <UserStats stats={userStats} />
            </div>
          </div>
        </div>
        {/* Main content */}
        <div className="main-content">
          {!selectedConversationId ? (
            <div className="empty-state">
              <svg
                viewBox="0 0 24 24"
                width="80"
                height="80"
                stroke="#5c70e2"
                strokeWidth="1"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-4"
              >
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                <rect x="9" y="9" width="6" height="6"></rect>
                <line x1="9" y1="1" x2="9" y2="4"></line>
                <line x1="15" y1="1" x2="15" y2="4"></line>
                <line x1="9" y1="20" x2="9" y2="23"></line>
                <line x1="15" y1="20" x2="15" y2="23"></line>
                <line x1="20" y1="9" x2="23" y2="9"></line>
                <line x1="20" y1="14" x2="23" y2="14"></line>
                <line x1="1" y1="9" x2="4" y2="9"></line>
                <line x1="1" y1="14" x2="4" y2="14"></line>
              </svg>
              <h2 className="empty-state-title">Welcome to LLM Studio</h2>
              <p className="empty-state-description">
                Select a conversation from the sidebar or create a new one to
                get started. Make sure to select an LLM model first.
              </p>
              <button
                className="new-chat-button"
                onClick={handleCreateNewConversation}
                disabled={!selectedLLM}
              >
                <FiPlus size={18} />
                <span>Start New Conversation</span>
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
