// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiUsers,
  FiCpu,
  FiSettings,
  FiBarChart2,
  FiDatabase,
  FiUser,
  FiLogOut,
  FiChevronDown,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiRefreshCw,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import "./AdminDashboard.css";

// Mock data - would be replaced with real API calls
const mockUsers = [
  {
    id: 1,
    username: "john_doe",
    email: "john@example.com",
    role: "user",
    status: "active",
    lastLogin: "2023-06-15T10:30:00Z",
    conversationsCount: 24,
  },
  {
    id: 2,
    username: "jane_smith",
    email: "jane@example.com",
    role: "user",
    status: "active",
    lastLogin: "2023-06-14T08:15:00Z",
    conversationsCount: 15,
  },
  {
    id: 3,
    username: "tech_support",
    email: "tech@example.com",
    role: "technician",
    status: "active",
    lastLogin: "2023-06-16T09:45:00Z",
    conversationsCount: 8,
  },
  {
    id: 4,
    username: "admin_user",
    email: "admin@example.com",
    role: "admin",
    status: "active",
    lastLogin: "2023-06-16T11:20:00Z",
    conversationsCount: 12,
  },
  {
    id: 5,
    username: "inactive_user",
    email: "inactive@example.com",
    role: "user",
    status: "disabled",
    lastLogin: "2023-05-20T15:10:00Z",
    conversationsCount: 3,
  },
];

const mockLLMs = [
  {
    id: 1,
    name: "GPT-4",
    provider: "OpenAI",
    apiEndpoint: "https://api.openai.com/v1/chat/completions",
    tokenLimit: 8000,
    costPer1kTokens: 0.08,
    status: "active",
    usage: {
      totalTokens: 1250000,
      totalCost: 100.0,
      activeUsers: 42,
    },
  },
  {
    id: 2,
    name: "Claude 3",
    provider: "Anthropic",
    apiEndpoint: "https://api.anthropic.com/v1/complete",
    tokenLimit: 100000,
    costPer1kTokens: 0.07,
    status: "active",
    usage: {
      totalTokens: 890000,
      totalCost: 62.3,
      activeUsers: 28,
    },
  },
  {
    id: 3,
    name: "Gemini Pro",
    provider: "Google",
    apiEndpoint: "https://api.google.com/v1/models/gemini-pro",
    tokenLimit: 12000,
    costPer1kTokens: 0.06,
    status: "active",
    usage: {
      totalTokens: 520000,
      totalCost: 31.2,
      activeUsers: 19,
    },
  },
  {
    id: 4,
    name: "Llama 3",
    provider: "Meta",
    apiEndpoint: "https://api.meta.com/v1/llama3",
    tokenLimit: 10000,
    costPer1kTokens: 0.01,
    status: "active",
    usage: {
      totalTokens: 350000,
      totalCost: 3.5,
      activeUsers: 15,
    },
  },
  {
    id: 5,
    name: "Mistral Large",
    provider: "Mistral AI",
    apiEndpoint: "https://api.mistral.ai/v1/models/large",
    tokenLimit: 32000,
    costPer1kTokens: 0.05,
    status: "maintenance",
    usage: {
      totalTokens: 180000,
      totalCost: 9.0,
      activeUsers: 8,
    },
  },
];

const mockSystemStats = {
  activeUsers: 78,
  totalConversations: 1243,
  totalTokensUsed: 3190000,
  totalCost: 206.0,
  activeModels: 4,
  systemUptime: "99.98%",
  averageResponseTime: "1.2s",
};

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const [users, setUsers] = useState(mockUsers);
  const [llms, setLlms] = useState(mockLLMs);
  const [systemStats, setSystemStats] = useState(mockSystemStats);
  const [isLoading, setIsLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showLLMModal, setShowLLMModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentLLM, setCurrentLLM] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadAdminData = async () => {
      setIsLoading(true);
      // Simulate API calls
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    };

    loadAdminData();
  }, []);

  const handleEditUser = (user) => {
    setCurrentUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      // In a real app, you would make an API call here
      setUsers(users.filter((user) => user.id !== userId));
      toast.success("User deleted successfully");
    }
  };

  const handleEditLLM = (llm) => {
    setCurrentLLM(llm);
    setShowLLMModal(true);
  };

  const handleDeleteLLM = (llmId) => {
    if (window.confirm("Are you sure you want to delete this LLM?")) {
      // In a real app, you would make an API call here
      setLlms(llms.filter((llm) => llm.id !== llmId));
      toast.success("LLM deleted successfully");
    }
  };

  const handleUserStatusChange = (userId, newStatus) => {
    // In a real app, you would make an API call here
    setUsers(
      users.map((user) =>
        user.id === userId ? { ...user, status: newStatus } : user
      )
    );
    toast.success(`User status updated to ${newStatus}`);
  };

  const handleLLMStatusChange = (llmId, newStatus) => {
    // In a real app, you would make an API call here
    setLlms(
      llms.map((llm) =>
        llm.id === llmId ? { ...llm, status: newStatus } : llm
      )
    );
    toast.success(`LLM status updated to ${newStatus}`);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLLMs = llms.filter(
    (llm) =>
      llm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      llm.provider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <div className="admin-logo">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="admin-logo-icon"
            >
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 className="admin-title">
              LLM Studio <span className="admin-subtitle">Admin</span>
            </h1>
          </div>
        </div>
        <div className="admin-header-right">
          <div className="admin-search">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="admin-user-menu">
            <div className="user-info">
              <div className="user-avatar">
                <FiUser />
              </div>
              <span className="user-name">{user?.username || "Admin"}</span>
              <FiChevronDown className="dropdown-icon" />
            </div>
            <div className="user-dropdown">
              <button
                className="dropdown-item"
                onClick={() => navigate("/settings")}
              >
                <FiSettings />
                <span>Settings</span>
              </button>
              <button className="dropdown-item logout" onClick={handleLogout}>
                <FiLogOut />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="admin-content">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <nav className="admin-nav">
            <button
              className={`nav-item ${
                activeSection === "overview" ? "active" : ""
              }`}
              onClick={() => setActiveSection("overview")}
            >
              <FiBarChart2 className="nav-icon" />
              <span>Overview</span>
            </button>
            <button
              className={`nav-item ${
                activeSection === "users" ? "active" : ""
              }`}
              onClick={() => setActiveSection("users")}
            >
              <FiUsers className="nav-icon" />
              <span>User Management</span>
            </button>
            <button
              className={`nav-item ${activeSection === "llms" ? "active" : ""}`}
              onClick={() => setActiveSection("llms")}
            >
              <FiCpu className="nav-icon" />
              <span>LLM Management</span>
            </button>
            <button
              className={`nav-item ${
                activeSection === "system" ? "active" : ""
              }`}
              onClick={() => setActiveSection("system")}
            >
              <FiSettings className="nav-icon" />
              <span>System Settings</span>
            </button>
            <button
              className={`nav-item ${
                activeSection === "database" ? "active" : ""
              }`}
              onClick={() => setActiveSection("database")}
            >
              <FiDatabase className="nav-icon" />
              <span>Database</span>
            </button>
          </nav>
        </aside>

        {/* Main area */}
        <main className="admin-main">
          {isLoading ? (
            <div className="loading-spinner">Loading...</div>
          ) : (
            <>
              {/* Overview Section */}
              {activeSection === "overview" && (
                <section className="admin-section">
                  <h2 className="section-title">System Overview</h2>

                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon users">
                        <FiUsers />
                      </div>
                      <div className="stat-info">
                        <h3 className="stat-title">Active Users</h3>
                        <p className="stat-value">{systemStats.activeUsers}</p>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon models">
                        <FiCpu />
                      </div>
                      <div className="stat-info">
                        <h3 className="stat-title">Active Models</h3>
                        <p className="stat-value">{systemStats.activeModels}</p>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon conversations">
                        <FiBarChart2 />
                      </div>
                      <div className="stat-info">
                        <h3 className="stat-title">Total Conversations</h3>
                        <p className="stat-value">
                          {systemStats.totalConversations}
                        </p>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon cost">
                        <FiDatabase />
                      </div>
                      <div className="stat-info">
                        <h3 className="stat-title">Total Cost</h3>
                        <p className="stat-value">
                          ${systemStats.totalCost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="overview-details">
                    <div className="overview-card">
                      <h3 className="card-title">System Health</h3>
                      <div className="health-metrics">
                        <div className="metric">
                          <span className="metric-label">Uptime</span>
                          <span className="metric-value">
                            {systemStats.systemUptime}
                          </span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">
                            Avg Response Time
                          </span>
                          <span className="metric-value">
                            {systemStats.averageResponseTime}
                          </span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">
                            Total Tokens Used
                          </span>
                          <span className="metric-value">
                            {systemStats.totalTokensUsed.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="overview-card">
                      <h3 className="card-title">Most Active LLMs</h3>
                      <ul className="llm-list">
                        {llms
                          .sort(
                            (a, b) => b.usage.totalTokens - a.usage.totalTokens
                          )
                          .slice(0, 3)
                          .map((llm) => (
                            <li key={llm.id} className="llm-item">
                              <div className="llm-info">
                                <h4 className="llm-name">{llm.name}</h4>
                                <p className="llm-provider">{llm.provider}</p>
                              </div>
                              <div className="llm-usage">
                                <div className="usage-metric">
                                  <span className="metric-label">Tokens</span>
                                  <span className="metric-value">
                                    {llm.usage.totalTokens.toLocaleString()}
                                  </span>
                                </div>
                                <div className="usage-metric">
                                  <span className="metric-label">Cost</span>
                                  <span className="metric-value">
                                    ${llm.usage.totalCost.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                </section>
              )}

              {/* User Management Section */}
              {activeSection === "users" && (
                <section className="admin-section">
                  <div className="section-header">
                    <h2 className="section-title">User Management</h2>
                    <button
                      className="action-button"
                      onClick={() => {
                        setCurrentUser(null);
                        setShowUserModal(true);
                      }}
                    >
                      <FiPlus /> Add User
                    </button>
                  </div>

                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Last Login</th>
                          <th>Conversations</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.id}>
                            <td>{user.username}</td>
                            <td>{user.email}</td>
                            <td>
                              <span className={`role-badge ${user.role}`}>
                                {user.role}
                              </span>
                            </td>
                            <td>
                              <select
                                className={`status-select ${user.status}`}
                                value={user.status}
                                onChange={(e) =>
                                  handleUserStatusChange(
                                    user.id,
                                    e.target.value
                                  )
                                }
                              >
                                <option value="active">Active</option>
                                <option value="disabled">Disabled</option>
                              </select>
                            </td>
                            <td>{new Date(user.lastLogin).toLocaleString()}</td>
                            <td>{user.conversationsCount}</td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="edit-button"
                                  onClick={() => handleEditUser(user)}
                                  title="Edit user"
                                >
                                  <FiEdit />
                                </button>
                                <button
                                  className="delete-button"
                                  onClick={() => handleDeleteUser(user.id)}
                                  title="Delete user"
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* LLM Management Section */}
              {activeSection === "llms" && (
                <section className="admin-section">
                  <div className="section-header">
                    <h2 className="section-title">LLM Management</h2>
                    <button
                      className="action-button"
                      onClick={() => {
                        setCurrentLLM(null);
                        setShowLLMModal(true);
                      }}
                    >
                      <FiPlus /> Add LLM
                    </button>
                  </div>

                  <div className="llm-cards">
                    {filteredLLMs.map((llm) => (
                      <div key={llm.id} className="llm-card">
                        <div className="llm-card-header">
                          <h3 className="llm-name">{llm.name}</h3>
                          <div className="llm-actions">
                            <button
                              className="action-icon"
                              onClick={() => handleEditLLM(llm)}
                              title="Edit LLM"
                            >
                              <FiEdit />
                            </button>
                            <button
                              className="action-icon"
                              onClick={() => handleDeleteLLM(llm.id)}
                              title="Delete LLM"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>

                        <div className="llm-provider">
                          <span className="provider-label">Provider:</span>
                          <span className="provider-value">{llm.provider}</span>
                        </div>

                        <div className="llm-details">
                          <div className="llm-detail">
                            <span className="detail-label">Token Limit:</span>
                            <span className="detail-value">
                              {llm.tokenLimit.toLocaleString()}
                            </span>
                          </div>
                          <div className="llm-detail">
                            <span className="detail-label">Cost per 1k:</span>
                            <span className="detail-value">
                              ${llm.costPer1kTokens}
                            </span>
                          </div>
                          <div className="llm-detail">
                            <span className="detail-label">Status:</span>
                            <select
                              className={`status-select mini ${llm.status}`}
                              value={llm.status}
                              onChange={(e) =>
                                handleLLMStatusChange(llm.id, e.target.value)
                              }
                            >
                              <option value="active">Active</option>
                              <option value="maintenance">Maintenance</option>
                              <option value="disabled">Disabled</option>
                            </select>
                          </div>
                        </div>

                        <div className="llm-usage-stats">
                          <div className="usage-stat">
                            <span className="stat-label">Total Tokens</span>
                            <span className="stat-value">
                              {llm.usage.totalTokens.toLocaleString()}
                            </span>
                          </div>
                          <div className="usage-stat">
                            <span className="stat-label">Total Cost</span>
                            <span className="stat-value">
                              ${llm.usage.totalCost.toFixed(2)}
                            </span>
                          </div>
                          <div className="usage-stat">
                            <span className="stat-label">Active Users</span>
                            <span className="stat-value">
                              {llm.usage.activeUsers}
                            </span>
                          </div>
                        </div>

                        <div className="llm-actions-footer">
                          <button className="refresh-button">
                            <FiRefreshCw /> Test Connection
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* System Settings Section */}
              {activeSection === "system" && (
                <section className="admin-section">
                  <h2 className="section-title">System Settings</h2>

                  <div className="settings-container">
                    <div className="settings-group">
                      <h3 className="group-title">Authentication</h3>

                      <div className="settings-form-group">
                        <label>Token Expiration (minutes)</label>
                        <input
                          type="number"
                          className="settings-input"
                          defaultValue="60"
                          min="5"
                          max="1440"
                        />
                      </div>

                      <div className="settings-form-group">
                        <label>Maximum Login Attempts</label>
                        <input
                          type="number"
                          className="settings-input"
                          defaultValue="5"
                          min="1"
                          max="10"
                        />
                      </div>

                      <div className="settings-form-group">
                        <label>Password Policy</label>
                        <select className="settings-select">
                          <option value="standard">
                            Standard (8+ chars, mixed case)
                          </option>
                          <option value="strong">
                            Strong (12+ chars, mixed case, symbols)
                          </option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>

                      <div className="settings-form-group checkbox">
                        <input type="checkbox" id="mfa" defaultChecked />
                        <label htmlFor="mfa">
                          Require MFA for Admin accounts
                        </label>
                      </div>
                    </div>

                    <div className="settings-group">
                      <h3 className="group-title">API and Rate Limits</h3>

                      <div className="settings-form-group">
                        <label>Requests per minute (per user)</label>
                        <input
                          type="number"
                          className="settings-input"
                          defaultValue="60"
                          min="1"
                          max="1000"
                        />
                      </div>

                      <div className="settings-form-group">
                        <label>Max token allocation per user/day</label>
                        <input
                          type="number"
                          className="settings-input"
                          defaultValue="50000"
                          min="1000"
                        />
                      </div>

                      <div className="settings-form-group">
                        <label>Concurrent requests per user</label>
                        <input
                          type="number"
                          className="settings-input"
                          defaultValue="3"
                          min="1"
                          max="10"
                        />
                      </div>
                    </div>

                    <div className="settings-group">
                      <h3 className="group-title">System Maintenance</h3>

                      <div className="settings-form-group">
                        <label>Automatic backup frequency</label>
                        <select className="settings-select">
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>

                      <div className="settings-form-group">
                        <label>Backup retention (days)</label>
                        <input
                          type="number"
                          className="settings-input"
                          defaultValue="30"
                          min="1"
                          max="365"
                        />
                      </div>

                      <div className="settings-form-group checkbox">
                        <input
                          type="checkbox"
                          id="auto-updates"
                          defaultChecked
                        />
                        <label htmlFor="auto-updates">
                          Enable automatic updates
                        </label>
                      </div>

                      <button className="backup-button action-button">
                        <FiDatabase /> Create Manual Backup
                      </button>
                    </div>

                    <div className="settings-actions">
                      <button className="save-button">Save Settings</button>
                      <button className="reset-button">
                        Reset to Defaults
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Database Section */}
              {activeSection === "database" && (
                <section className="admin-section">
                  <h2 className="section-title">Database Management</h2>

                  <div className="database-status">
                    <div className="status-card">
                      <h3 className="card-title">MongoDB Status</h3>

                      <div className="status-metric">
                        <span className="metric-label">Status</span>
                        <span className="metric-value connected">
                          Connected
                        </span>
                      </div>

                      <div className="status-metric">
                        <span className="metric-label">Version</span>
                        <span className="metric-value">5.0.14</span>
                      </div>

                      <div className="status-metric">
                        <span className="metric-label">Uptime</span>
                        <span className="metric-value">14d 6h 32m</span>
                      </div>

                      <div className="status-metric">
                        <span className="metric-label">Storage Size</span>
                        <span className="metric-value">1.24 GB</span>
                      </div>
                    </div>

                    <div className="status-card">
                      <h3 className="card-title">Collections</h3>

                      <div className="collection-list">
                        <div className="collection-item">
                          <span className="collection-name">users</span>
                          <span className="collection-count">
                            124 documents
                          </span>
                        </div>
                        <div className="collection-item">
                          <span className="collection-name">conversations</span>
                          <span className="collection-count">
                            1,243 documents
                          </span>
                        </div>
                        <div className="collection-item">
                          <span className="collection-name">messages</span>
                          <span className="collection-count">
                            15,872 documents
                          </span>
                        </div>
                        <div className="collection-item">
                          <span className="collection-name">llms</span>
                          <span className="collection-count">5 documents</span>
                        </div>
                        <div className="collection-item">
                          <span className="collection-name">settings</span>
                          <span className="collection-count">12 documents</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="database-actions">
                    <div className="action-group">
                      <h3 className="group-title">Maintenance</h3>

                      <div className="db-action-buttons">
                        <button className="db-action-button">
                          <FiRefreshCw className="button-icon" />
                          <span>Repair Database</span>
                        </button>

                        <button className="db-action-button">
                          <FiDatabase className="button-icon" />
                          <span>Compact Collections</span>
                        </button>

                        <button className="db-action-button">
                          <FiBarChart2 className="button-icon" />
                          <span>Rebuild Indexes</span>
                        </button>
                      </div>
                    </div>

                    <div className="action-group">
                      <h3 className="group-title">Backup & Restore</h3>

                      <div className="backup-list">
                        <div className="backup-item">
                          <span className="backup-date">2023-06-16 03:00</span>
                          <span className="backup-size">1.18 GB</span>
                          <div className="backup-actions">
                            <button
                              className="icon-button"
                              title="Restore from this backup"
                            >
                              <FiRefreshCw />
                            </button>
                            <button
                              className="icon-button"
                              title="Download backup"
                            >
                              <FiDatabase />
                            </button>
                            <button
                              className="icon-button"
                              title="Delete backup"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>

                        <div className="backup-item">
                          <span className="backup-date">2023-06-15 03:00</span>
                          <span className="backup-size">1.15 GB</span>
                          <div className="backup-actions">
                            <button
                              className="icon-button"
                              title="Restore from this backup"
                            >
                              <FiRefreshCw />
                            </button>
                            <button
                              className="icon-button"
                              title="Download backup"
                            >
                              <FiDatabase />
                            </button>
                            <button
                              className="icon-button"
                              title="Delete backup"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>

                        <div className="backup-item">
                          <span className="backup-date">2023-06-14 03:00</span>
                          <span className="backup-size">1.12 GB</span>
                          <div className="backup-actions">
                            <button
                              className="icon-button"
                              title="Restore from this backup"
                            >
                              <FiRefreshCw />
                            </button>
                            <button
                              className="icon-button"
                              title="Download backup"
                            >
                              <FiDatabase />
                            </button>
                            <button
                              className="icon-button"
                              title="Delete backup"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{currentUser ? "Edit User" : "Add New User"}</h3>
              <button
                className="close-button"
                onClick={() => setShowUserModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  className="form-input"
                  defaultValue={currentUser?.username || ""}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  defaultValue={currentUser?.email || ""}
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  className="form-select"
                  defaultValue={currentUser?.role || "user"}
                >
                  <option value="user">User</option>
                  <option value="technician">Technician</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  className="form-select"
                  defaultValue={currentUser?.status || "active"}
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              {!currentUser && (
                <>
                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                      type="password"
                      id="password"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      className="form-input"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="cancel-button"
                onClick={() => setShowUserModal(false)}
              >
                Cancel
              </button>
              <button
                className="save-button"
                onClick={() => {
                  // Handle save logic here
                  setShowUserModal(false);
                  toast.success(
                    currentUser
                      ? "User updated successfully"
                      : "User added successfully"
                  );
                }}
              >
                {currentUser ? "Update User" : "Add User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LLM Modal */}
      {showLLMModal && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{currentLLM ? "Edit LLM" : "Add New LLM"}</h3>
              <button
                className="close-button"
                onClick={() => setShowLLMModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="name">Model Name</label>
                <input
                  type="text"
                  id="name"
                  className="form-input"
                  defaultValue={currentLLM?.name || ""}
                />
              </div>

              <div className="form-group">
                <label htmlFor="provider">Provider</label>
                <input
                  type="text"
                  id="provider"
                  className="form-input"
                  defaultValue={currentLLM?.provider || ""}
                />
              </div>

              <div className="form-group">
                <label htmlFor="apiEndpoint">API Endpoint</label>
                <input
                  type="text"
                  id="apiEndpoint"
                  className="form-input"
                  defaultValue={currentLLM?.apiEndpoint || ""}
                />
              </div>

              <div className="form-group">
                <label htmlFor="apiKey">
                  API Key (leave blank to keep current)
                </label>
                <input type="password" id="apiKey" className="form-input" />
              </div>

              <div className="form-group">
                <label htmlFor="tokenLimit">Token Limit</label>
                <input
                  type="number"
                  id="tokenLimit"
                  className="form-input"
                  defaultValue={currentLLM?.tokenLimit || 8000}
                  min="1000"
                />
              </div>

              <div className="form-group">
                <label htmlFor="costPer1kTokens">Cost per 1k Tokens ($)</label>
                <input
                  type="number"
                  id="costPer1kTokens"
                  className="form-input"
                  defaultValue={currentLLM?.costPer1kTokens || 0.03}
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="llmStatus">Status</label>
                <select
                  id="llmStatus"
                  className="form-select"
                  defaultValue={currentLLM?.status || "active"}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-button"
                onClick={() => setShowLLMModal(false)}
              >
                Cancel
              </button>
              <button
                className="save-button"
                onClick={() => {
                  // Handle save logic here
                  setShowLLMModal(false);
                  toast.success(
                    currentLLM
                      ? "LLM updated successfully"
                      : "LLM added successfully"
                  );
                }}
              >
                {currentLLM ? "Update LLM" : "Add LLM"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
