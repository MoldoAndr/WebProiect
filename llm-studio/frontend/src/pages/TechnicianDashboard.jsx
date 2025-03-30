import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiCpu,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiSettings,
  FiArrowLeft,
  FiSave,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import axios from "axios";
import { API_URL } from "../config";
import "./TechnicianDashboard.css";

const TechnicianDashboard = () => {
  const [llms, setLlms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLLMModal, setShowLLMModal] = useState(false);
  const [currentLLM, setCurrentLLM] = useState(null);
  const [testConnectionStatus, setTestConnectionStatus] = useState({});
  const [activeTab, setActiveTab] = useState("active");

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLLMs();
  }, []);

  const fetchLLMs = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/llms`);
      setLlms(response.data || []);
    } catch (error) {
      console.error("Error fetching LLMs:", error);
      toast.error("Failed to fetch LLM models. Using sample data.");

      const mockLLMs = [
        {
          id: "1",
          name: "GPT-4",
          description: "OpenAI's most advanced model",
          api_endpoint: "https://api.openai.com/v1/chat/completions",
          parameters: {
            max_tokens: 8192,
            temperature: 0.7,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            stream: false,
          },
          status: "active",
          provider: "OpenAI",
          token_limit: 8192,
          cost_per_1k_tokens: 0.06,
        },
        {
          id: "2",
          name: "Claude 3",
          description: "Anthropic's Claude 3 model",
          api_endpoint: "https://api.anthropic.com/v1/complete",
          parameters: {
            max_tokens_to_sample: 4096,
            temperature: 0.8,
            top_p: 0.9,
            top_k: 40,
          },
          status: "active",
          provider: "Anthropic",
          token_limit: 100000,
          cost_per_1k_tokens: 0.03,
        },
        {
          id: "3",
          name: "Llama 3",
          description: "Meta's open source LLM",
          api_endpoint: "http://localhost:8000/llama3",
          parameters: {
            max_length: 4096,
            temperature: 0.6,
            top_p: 0.9,
            repetition_penalty: 1.1,
          },
          status: "maintenance",
          provider: "Meta",
          token_limit: 8192,
          cost_per_1k_tokens: 0.0001,
        },
        {
          id: "4",
          name: "Mistral 7B",
          description: "Mistral AI's efficient model",
          api_endpoint: "https://api.mistral.ai/v1/models/mistral-7b",
          parameters: {
            max_tokens: 4096,
            temperature: 0.7,
            top_p: 0.9,
          },
          status: "inactive",
          provider: "Mistral AI",
          token_limit: 8192,
          cost_per_1k_tokens: 0.005,
        },
      ];
      setLlms(mockLLMs);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditLLM = (llm) => {
    setCurrentLLM(llm);
    setShowLLMModal(true);
  };

  const handleDeleteLLM = async (llmId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this LLM? This action cannot be undone."
      )
    ) {
      try {
        setIsLoading(true);
        // In production, make an API call
        await axios.delete(`${API_URL}/llms/${llmId}`);
        toast.success("LLM deleted successfully");
        // Update the local state
        setLlms(llms.filter((llm) => llm.id !== llmId));
      } catch (error) {
        console.error("Error deleting LLM:", error);
        toast.error("Failed to delete LLM");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleTestConnection = async (llmId) => {
    setTestConnectionStatus((prev) => ({ ...prev, [llmId]: "testing" }));

    try {
      // Simulate API call to test connection
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Random success/failure to simulate actual testing
      const success = Math.random() > 0.3;

      if (success) {
        setTestConnectionStatus((prev) => ({ ...prev, [llmId]: "success" }));
        toast.success("Connection successful!");
      } else {
        setTestConnectionStatus((prev) => ({ ...prev, [llmId]: "error" }));
        toast.error(
          "Connection failed. Please check API endpoint and credentials."
        );
      }

      // Clear status after 3 seconds
      setTimeout(() => {
        setTestConnectionStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[llmId];
          return newStatus;
        });
      }, 3000);
    } catch (error) {
      setTestConnectionStatus((prev) => ({ ...prev, [llmId]: "error" }));
      toast.error("Error testing connection");
    }
  };

  const handleStatusChange = async (llmId, newStatus) => {
    try {
      setIsLoading(true);
      // In production, make an API call
      await axios.put(`${API_URL}/llms/${llmId}`, { status: newStatus });

      // Update the local state
      setLlms(
        llms.map((llm) =>
          llm.id === llmId ? { ...llm, status: newStatus } : llm
        )
      );

      toast.success(`LLM status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating LLM status:", error);
      toast.error("Failed to update LLM status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const filteredLLMs = llms.filter((llm) => {
    const matchesSearch =
      llm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      llm.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      llm.description?.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    return matchesSearch && llm.status === activeTab;
  });

  const getStatusClass = (status) => {
    switch (status) {
      case "active":
        return "status-active";
      case "maintenance":
        return "status-maintenance";
      case "inactive":
        return "status-inactive";
      default:
        return "";
    }
  };

  const getTestConnectionStatusIcon = (llmId) => {
    const status = testConnectionStatus[llmId];
    if (!status) return null;

    if (status === "testing") {
      return <FiRefreshCw className="animate-spin" />;
    } else if (status === "success") {
      return <span className="status-success">✓</span>;
    } else if (status === "error") {
      return <span className="status-error">✕</span>;
    }

    return null;
  };

  const renderLLMModal = () => {
    if (!showLLMModal) return null;
  };

  return (
    <div className="dashboard-container">
      <DashboardHeader user={user} />

      <div className="technician-dashboard">
        <div className="technician-header">
          <div className="back-section">
            <button className="back-button" onClick={handleBackToDashboard}>
              <FiArrowLeft size={18} />
              <span>Back to Dashboard</span>
            </button>
            <h1>LLM Management</h1>
          </div>

          <div className="header-actions">
            <div className="search-container">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <button
              className="add-model-button"
              onClick={() => {
                setCurrentLLM(null);
                setShowLLMModal(true);
              }}
            >
              <FiPlus size={18} />
              <span>Add Model</span>
            </button>
          </div>
        </div>

        <div className="technician-tabs">
          <button
            className={`tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Models
          </button>
          <button
            className={`tab ${activeTab === "active" ? "active" : ""}`}
            onClick={() => setActiveTab("active")}
          >
            Active
          </button>
          <button
            className={`tab ${activeTab === "maintenance" ? "active" : ""}`}
            onClick={() => setActiveTab("maintenance")}
          >
            Maintenance
          </button>
          <button
            className={`tab ${activeTab === "inactive" ? "active" : ""}`}
            onClick={() => setActiveTab("inactive")}
          >
            Inactive
          </button>
        </div>

        <div className="models-grid">
          {isLoading ? (
            <div className="loading-container">
              <FiRefreshCw className="loading-spinner" />
              <p>Loading models...</p>
            </div>
          ) : filteredLLMs.length === 0 ? (
            <div className="no-models">
              <FiCpu size={48} />
              <h3>No models found</h3>
              <p>
                {searchTerm
                  ? "Try adjusting your search term"
                  : "Add a new model to get started"}
              </p>
              <button
                className="add-model-button"
                onClick={() => {
                  setCurrentLLM(null);
                  setShowLLMModal(true);
                }}
              >
                <FiPlus size={16} />
                <span>Add Model</span>
              </button>
            </div>
          ) : (
            filteredLLMs.map((llm) => (
              <div key={llm.id} className="model-card">
                <div className="model-header">
                  <div className="model-title">
                    <h2>{llm.name}</h2>
                    <span
                      className={`model-status ${getStatusClass(llm.status)}`}
                    >
                      {llm.status}
                    </span>
                  </div>
                  <div className="model-actions">
                    <button
                      className="action-button edit"
                      onClick={() => handleEditLLM(llm)}
                      title="Edit model"
                    >?
                    </button>
                    <button
                      className="action-button delete"
                      onClick={() => handleDeleteLLM(llm.id)}
                      title="Delete model"
                    >X
                     </button>
                  </div>
                </div>

                <div className="model-details">
                  <div className="detail">
                    <span className="detail-label">Provider:</span>
                    <span className="detail-value">{llm.provider}</span>
                  </div>
                  <div className="detail description">
                    <p>{llm.description}</p>
                  </div>
                  <div className="detail endpoint">
                    <span className="detail-label">API Endpoint:</span>
                    <span className="detail-value endpoint">
                      {llm.api_endpoint}
                    </span>
                  </div>
                  <div className="detail-row">
                    <div className="detail">
                      <span className="detail-label">Token Limit:</span>
                      <span className="detail-value">
                        {llm.token_limit?.toLocaleString()}
                      </span>
                    </div>
                    <div className="detail">
                      <span className="detail-label">Cost per 1K tokens:</span>
                      <span className="detail-value">
                        ${llm.cost_per_1k_tokens}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="model-parameters">
                  <h3>Parameters</h3>
                  <div className="parameters-grid">
                    {llm.parameters &&
                      Object.entries(llm.parameters).map(([key, value]) => (
                        <div key={key} className="parameter">
                          <span className="parameter-name">
                            {key.replace(/_/g, " ")}:
                          </span>
                          <span className="parameter-value">
                            {typeof value === "boolean"
                              ? value
                                ? "Yes"
                                : "No"
                              : value}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="model-footer">
                  <div className="status-control">
                    <label htmlFor={`status-${llm.id}`}>Status:</label>
                    <select
                      id={`status-${llm.id}`}
                      value={llm.status}
                      onChange={(e) =>
                        handleStatusChange(llm.id, e.target.value)
                      }
                      className={`status-select ${getStatusClass(llm.status)}`}
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <button
                    className="test-connection-button"
                    onClick={() => handleTestConnection(llm.id)}
                    disabled={testConnectionStatus[llm.id] === "testing"}
                  >
                    {getTestConnectionStatusIcon(llm.id) || (
                      <FiRefreshCw size={14} />
                    )}
                    <span>Test Connection</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showLLMModal && renderLLMModal()}
    </div>
  );
};

export default TechnicianDashboard;
