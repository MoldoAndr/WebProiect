import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiUsers,
  FiCpu,
  FiBarChart2,
  FiUser,
  FiLogOut,
  FiChevronDown,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiLoader,
  FiDownloadCloud,
  FiFileText,
  FiMessageCircle,
  FiX,
  FiRepeat,
  FiAlertCircle,
  FiSend,
  FiInfo,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { adminChatService } from "../services/admin-chat.service";
import "./AdminDashboard.css";
import { API_URL } from "../config";
const API_V1_STR = API_URL;

const fetchApi = async (url, token, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  try {
    const fullUrl = `${API_V1_STR}${url}`;
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });
    let responseBody;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      if (
        response.status === 204 ||
        response.headers.get("content-length") === "0"
      ) {
        responseBody = null;
      } else {
        responseBody = await response.json();
      }
    } else {
      if (
        response.status !== 204 &&
        response.headers.get("content-length") !== "0"
      ) {
        responseBody = await response.text();
      } else {
        responseBody = null;
      }
    }
    if (!response.ok) {
      let errorDetail = `HTTP error! status: ${response.status}`;
      if (
        responseBody &&
        typeof responseBody === "object" &&
        responseBody.detail
      ) {
        if (Array.isArray(responseBody.detail)) {
          errorDetail = responseBody.detail
            .map((err) => `${err.loc?.join(".") || "error"}: ${err.msg}`)
            .join("; ");
        } else {
          errorDetail = responseBody.detail;
        }
      } else if (typeof responseBody === "string" && responseBody.length > 0) {
        errorDetail = responseBody;
      }
      console.error("API Error Response:", response.status, responseBody);
      throw new Error(errorDetail);
    }
    return responseBody;
  } catch (error) {
    console.error(
      `Fetch API Error (${options.method || "GET"} ${url}):`,
      error
    );
    throw new Error(error.message || "An unknown API error occurred.");
  }
};

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const [users, setUsers] = useState([]);
  const [llms, setLlms] = useState([]);
  const [stats, setStats] = useState({
    total_admin_messages: 0,
    total_conversations: 0,
    total_messages: 0,
    avg_messages_per_conversation: 0,
    avg_conversations_per_user: 0,
    avg_tickets_per_user: 0,
  });
  const [isLoading, setIsLoading] = useState({
    users: false,
    llms: false,
    stats: false,
  });
  const [isMutating, setIsMutating] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showLLMModal, setShowLLMModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const authToken = user?.token || localStorage.getItem("token");

  // --- Data Loading Callbacks ---
  const loadUsers = useCallback(async () => {
    if (!authToken) return;
    setIsLoading((prev) => ({ ...prev, users: true }));
    try {
      const fetchedUsers = await fetchApi("/users", authToken);
      setUsers(fetchedUsers.map((u) => ({ ...u, id: u.id || u._id })));
    } catch (error) {
      toast.error(`Failed to load users: ${error.message}`);
      setUsers([]);
    } finally {
      setIsLoading((prev) => ({ ...prev, users: false }));
    }
  }, [authToken]);

  const loadLLMs = useCallback(async () => {
    setIsLoading((prev) => ({ ...prev, llms: true }));
    try {
      const fetchedLLMsData = await fetchApi("/llm-manager/models", null);
      let processedLlms = [];
      if (
        fetchedLLMsData &&
        typeof fetchedLLMsData === "object" &&
        !Array.isArray(fetchedLLMsData)
      ) {
        processedLlms = Object.values(fetchedLLMsData).map((llmDetails) => ({
          id: llmDetails.id,
          model_id: llmDetails.id,
          type: llmDetails.type || "unknown",
          path: llmDetails.model_path || "N/A",
          context_window: llmDetails.context_window,
          n_threads: llmDetails.n_threads,
          n_gpu_layers: llmDetails.n_gpu_layers,
          temperature: llmDetails.temperature,
          backend: llmDetails.backend,
          device_info: llmDetails.device_info,
          size_mb: llmDetails.size_mb,
        }));
        setLlms(processedLlms);
      } else {
        console.warn(
          "Received unexpected data format for LLMs:",
          fetchedLLMsData
        );
        setLlms([]);
        toast.warn("Could not parse LLM model data from the server.");
      }
    } catch (error) {
      toast.error(`Failed to load LLMs: ${error.message}`);
      setLlms([]);
    } finally {
      setIsLoading((prev) => ({ ...prev, llms: false }));
    }
  }, []);

  const loadStats = useCallback(async () => {
    if (!authToken) return;
    setIsLoading((prev) => ({ ...prev, stats: true }));
    try {
      const fetchedStats = await fetchApi("/llm-manager/stats", authToken);
      setStats({
        total_admin_messages: fetchedStats.total_admin_messages || 0,
        total_conversations: fetchedStats.total_conversations || 0,
        total_messages: fetchedStats.total_messages || 0,
        avg_messages_per_conversation:
          fetchedStats.avg_messages_per_conversation || 0,
        avg_conversations_per_user:
          fetchedStats.avg_conversations_per_user || 0,
        avg_tickets_per_user: fetchedStats.avg_tickets_per_user || 0,
      });
    } catch (error) {
      toast.error(`Failed to load statistics: ${error.message}`);
      setStats({
        total_admin_messages: 0,
        total_conversations: 0,
        total_messages: 0,
        avg_messages_per_conversation: 0,
        avg_conversations_per_user: 0,
        avg_tickets_per_user: 0,
      });
    } finally {
      setIsLoading((prev) => ({ ...prev, stats: false }));
    }
  }, [authToken]);

  // --- Initial Load and Auth Check ---
  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      toast.warn("Access denied. Redirecting to your dashboard.");
      const destination =
        user.role === "technician" ? "/technician-dashboard" : "/dashboard";
      navigate(destination);
      return;
    }
    if (authToken && user?.role === "admin") {
      loadUsers();
      loadLLMs();
      loadStats();
    } else if (!authLoading && !authToken) {
      console.log("Admin Dashboard: Not authenticated. Redirecting to login.");
      toast.info("Please log in to access the admin area.");
      navigate("/login");
    }
  }, [authToken, user, authLoading, loadUsers, loadLLMs, loadStats, navigate]);

  // --- Handlers for User and LLM Management ---
  const handleOpenEditUserModal = (userToEdit) => {
    setCurrentUser(userToEdit);
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!authToken) {
      toast.error("Authentication required.");
      return;
    }
    if (user?.id === userId) {
      toast.error("You cannot delete your own account.");
      return;
    }
    if (
      window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      setIsMutating(true);
      try {
        await fetchApi(`/users/${userId}`, authToken, { method: "DELETE" });
        setUsers((prevUsers) => prevUsers.filter((u) => u.id !== userId));
        toast.success("User deleted successfully");
      } catch (error) {
        toast.error(`Failed to delete user: ${error.message}`);
      } finally {
        setIsMutating(false);
      }
    }
  };

  const handleUserStatusChange = async (userId, newStatusBool) => {
    if (!authToken) {
      toast.error("Authentication required.");
      return;
    }
    if (user?.id === userId && !newStatusBool) {
      toast.error("You cannot deactivate your own account.");
      return;
    }
    setIsMutating(true);
    try {
      const updatedUser = await fetchApi(`/users/${userId}`, authToken, {
        method: "PUT",
        body: JSON.stringify({ is_active: newStatusBool }),
      });
      const finalUpdatedUser = {
        ...updatedUser,
        id: updatedUser.id || updatedUser._id,
      };
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? finalUpdatedUser : u))
      );
      toast.success(`User status updated`);
    } catch (error) {
      toast.error(`Failed to update user status: ${error.message}`);
    } finally {
      setIsMutating(false);
    }
  };

  const handleSaveUser = async (userData) => {
    if (!authToken) {
      toast.error("Authentication required.");
      return;
    }
    if (!currentUser) {
      toast.error("Cannot save user: No user selected for editing.");
      return;
    }
    if (user?.id === currentUser.id && userData.role !== user.role) {
      toast.error("You cannot change your own role here.");
      return;
    }
    setIsMutating(true);
    try {
      const { role, ...detailsToUpdate } = userData;
      const updatedUserDetails = await fetchApi(
        `/users/${currentUser.id}`,
        authToken,
        {
          method: "PUT",
          body: JSON.stringify(detailsToUpdate),
        }
      );
      let finalUpdatedUser = {
        ...updatedUserDetails,
        id: updatedUserDetails.id || updatedUserDetails._id,
      };
      if (role && role !== currentUser.role) {
        const updatedUserRole = await fetchApi(
          `/users/${currentUser.id}/role?role=${encodeURIComponent(role)}`,
          authToken,
          {
            method: "PUT",
          }
        );
        finalUpdatedUser = {
          ...updatedUserRole,
          id: updatedUserRole.id || updatedUserRole._id,
        };
      }
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === currentUser.id ? finalUpdatedUser : u))
      );
      setShowUserModal(false);
      setCurrentUser(null);
      toast.success("User updated successfully");
    } catch (error) {
      toast.error(`Failed to update user: ${error.message}`);
    } finally {
      setIsMutating(false);
    }
  };

  // --- LLM Management Handlers ---
  const handleOpenAddLLMModal = () => {
    setShowLLMModal(true);
  };

  const handleAddLLM = async (llmData) => {
    if (!authToken) {
      toast.error("Authentication required to add models.");
      return;
    }
    setIsMutating(true);
    try {
      const payload = {
        model_id: llmData.model_id,
        model_type: llmData.model_type || "llama",
        model_url: llmData.model_url || null,
        file_name: llmData.file_name || null,
        context_window: parseInt(llmData.context_window, 10) || 2048,
        n_threads: parseInt(llmData.n_threads, 10) || 4,
        n_gpu_layers: parseInt(llmData.n_gpu_layers, 10) || 0,
        temperature: parseFloat(llmData.temperature) || 0.7,
        keep_file_on_error: llmData.keep_file_on_error || false,
        auto_correct_type: llmData.auto_correct_type || true,
        download_only: llmData.download_only || false,
      };
      if (!payload.model_url && !payload.file_name) {
        throw new Error("Either Model URL or File Name/Path must be provided.");
      }
      await fetchApi("/llm-manager/models", authToken, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await loadLLMs();
      setShowLLMModal(false);
      toast.success(
        `LLM '${payload.model_id}' added successfully (or download initiated).`
      );
    } catch (error) {
      toast.error(`Failed to add LLM: ${error.message}`);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteLLM = async (modelIdToDelete) => {
    if (!authToken) {
      toast.error("Authentication required to delete models.");
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to delete the LLM with ID: ${modelIdToDelete}?`
      )
    ) {
      setIsMutating(true);
      try {
        await fetchApi(`/llm-manager/models/${modelIdToDelete}`, authToken, {
          method: "DELETE",
        });
        setLlms((prevLlms) =>
          prevLlms.filter((llm) => llm.id !== modelIdToDelete)
        );
        toast.success(`LLM '${modelIdToDelete}' deleted successfully.`);
      } catch (error) {
        toast.error(`Failed to delete LLM: ${error.message}`);
      } finally {
        setIsMutating(false);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // --- Filtering ---
  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredLLMs = llms.filter(
    (llm) =>
      llm.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      llm.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      llm.path?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const activeUserCount = users.filter((u) => u.is_active).length;
  const totalUserCount = users.length;
  const totalLLMCount = llms.length;
  const isSectionLoading = isLoading.users || isLoading.llms || isLoading.stats;

  if (authLoading) {
    return (
      <div className="loading-spinner">
        <FiLoader className="spin-icon" /> Loading Authentication...
      </div>
    );
  }
  if (!user || user.role !== "admin") {
    return (
      <div className="loading-spinner">
        <FiLoader className="spin-icon" /> Verifying access...
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
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
            <input
              type="text"
              placeholder="Search Users or LLMs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="user-info">
            <div className="avatar">
              <FiUser size={14} />
            </div>
            <span className="username">{user?.username || "User"}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="logout-button"
          >
            <FiLogOut size={16} className="logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </header>
      <div className="admin-content">
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
              className={`nav-item ${activeSection === "chat" ? "active" : ""}`}
              onClick={() => setActiveSection("chat")}
            >
              <FiMessageCircle className="nav-icon" />
              <span>Admin Chat</span>
            </button>
          </nav>
        </aside>
        <main className="admin-main">
          {isSectionLoading || isMutating ? (
            <div className="loading-spinner">
              <FiLoader className="spin-icon" />{" "}
              {isMutating ? "Processing..." : "Loading..."}
            </div>
          ) : (
            <>
              {activeSection === "overview" && (
                <section className="admin-section">
                  <h2 className="section-title">System Overview</h2>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon users">
                        <FiUsers />
                      </div>
                      <div className="stat-info">
                        <h3 className="stat-title">Total Users</h3>
                        <p className="stat-value">{totalUserCount}</p>
                        <p className="stat-subvalue">
                          {activeUserCount} Active
                        </p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon models">
                        <FiCpu />
                      </div>
                      <div className="stat-info">
                        <h3 className="stat-title">Available LLMs</h3>
                        <p className="stat-value">{totalLLMCount}</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon messages">
                        <FiMessageCircle />
                      </div>
                      <div className="stat-info">
                        <h3 className="stat-title">Total Admin Messages</h3>
                        <p className="stat-value">
                          {stats.total_admin_messages.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon conversations">
                        <FiBarChart2 />
                      </div>
                      <div className="stat-info">
                        <h3 className="stat-title">Total LLM Conversations</h3>
                        <p className="stat-value">
                          {stats.total_conversations.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon messages">
                        <FiMessageCircle />
                      </div>
                      <div className="stat-info">
                        <h3 className="stat-title">Total LLM Messages</h3>
                        <p className="stat-value">
                          {stats.total_messages.toLocaleString()}
                        </p>
                        <p className="stat-subvalue">
                          Avg/Conv: {stats.avg_messages_per_conversation}
                        </p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon users">
                        <FiUsers />
                      </div>
                      <div className="stat-info">
                        <h3 className="stat-title">User Activity</h3>
                        <p className="stat-value">
                          {stats.avg_conversations_per_user}
                        </p>
                        <p className="stat-subvalue">Avg Conv/User</p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon tickets">
                        <FiAlertCircle />
                      </div>
                      <div className="stat-info">
                        <h3 className="stat-title">Support Tickets</h3>
                        <p className="stat-value">
                          {stats.avg_tickets_per_user}
                        </p>
                        <p className="stat-subvalue">Avg Tickets/User</p>
                      </div>
                    </div>
                  </div>
                </section>
              )}
              {activeSection === "users" && (
                <section className="admin-section">
                  <div className="section-header">
                    <h2 className="section-title">User Management</h2>
                    <button
                      className="action-button refresh-button"
                      onClick={loadUsers}
                      disabled={isLoading.users}
                    >
                      <FiRefreshCw
                        className={isLoading.users ? "spin-icon" : ""}
                      />{" "}
                      Refresh Users
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
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id}>
                            <td>{u.username}</td>
                            <td>{u.email}</td>
                            <td>
                              <span className={`role-badge ${u.role}`}>
                                {u.role}
                              </span>
                            </td>
                            <td>
                              <select
                                className={`status-select ${
                                  u.is_active ? "active" : "disabled"
                                }`}
                                value={u.is_active ? "active" : "disabled"}
                                onChange={(e) =>
                                  handleUserStatusChange(
                                    u.id,
                                    e.target.value === "active"
                                  )
                                }
                                disabled={isMutating || user?.id === u.id}
                              >
                                <option value="active">Active</option>
                                <option value="disabled">Disabled</option>
                              </select>
                            </td>
                            <td>
                              {u.last_login
                                ? new Date(u.last_login).toLocaleString()
                                : "N/A"}
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="edit-button"
                                  onClick={() => handleOpenEditUserModal(u)}
                                  title="Edit user"
                                  disabled={isMutating}
                                >
                                  <FiEdit />
                                </button>
                                <button
                                  className="delete-button"
                                  onClick={() => handleDeleteUser(u.id)}
                                  title="Delete user"
                                  disabled={isMutating || user?.id === u.id}
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredUsers.length === 0 && !isLoading.users && (
                      <p className="no-data-message">
                        No users found matching your criteria.
                      </p>
                    )}
                  </div>
                </section>
              )}
              {activeSection === "llms" && (
                <section className="admin-section">
                  <div className="section-header">
                    <h2 className="section-title">LLM Models Viewer</h2>
                  </div>
                  <div className="llm-cards">
                    {filteredLLMs.map((llm) => (
                      <div key={llm.id} className="llm-card">
                        <div className="llm-card-header">
                          <h3 className="llm-name">{llm.model_id || llm.id}</h3>
                        </div>
                        <div className="llm-provider">
                          <span className="provider-label">Type:</span>
                          <span className="provider-value">{llm.type}</span>
                        </div>
                        <div className="llm-details">
                          <div className="llm-detail endpoint">
                            <span className="detail-label">
                              {llm.path?.startsWith("http") ? (
                                <FiDownloadCloud title="URL Source" />
                              ) : (
                                <FiFileText title="File Path Source" />
                              )}{" "}
                              Source:
                            </span>
                            <span
                              className="detail-value endpoint-value"
                              title={llm.path}
                            >
                              {llm.path || "N/A"}
                            </span>
                          </div>
                          <div className="llm-detail">
                            <span className="detail-label">Context:</span>
                            <span className="detail-value">
                              {llm.context_window?.toLocaleString() || "N/A"}
                            </span>
                          </div>
                          <div className="llm-detail">
                            <span className="detail-label">Threads:</span>
                            <span className="detail-value">
                              {llm.n_threads || "N/A"}
                            </span>
                          </div>
                          <div className="llm-detail">
                            <span className="detail-label">GPU Layers:</span>
                            <span className="detail-value">
                              {llm.n_gpu_layers ?? "N/A"}
                            </span>
                          </div>
                          <div className="llm-detail">
                            <span className="detail-label">Temp:</span>
                            <span className="detail-value">
                              {llm.temperature ?? "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredLLMs.length === 0 && !isLoading.llms && (
                      <p className="no-data-message">
                        {llms.length === 0
                          ? "No LLMs configured."
                          : "No LLMs found matching your criteria."}
                      </p>
                    )}
                  </div>
                </section>
              )}
              {activeSection === "chat" && <AdminChatSection />}
            </>
          )}
        </main>
      </div>
      {showUserModal && currentUser && authToken && (
        <UserEditModal
          user={currentUser}
          onClose={() => {
            setShowUserModal(false);
            setCurrentUser(null);
          }}
          onSave={handleSaveUser}
          isLoading={isMutating}
          currentAdminUser={user}
        />
      )}
      {showLLMModal && authToken && (
        <LLMAddModal
          onClose={() => {
            setShowLLMModal(false);
          }}
          onAdd={handleAddLLM}
          isLoading={isMutating}
        />
      )}
    </div>
  );
};

const AdminChatSection = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingTicket, setIsUpdatingTicket] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const fetchTickets = useCallback(async () => {
    // Only show loading state on initial load
    if (tickets.length === 0) {
      setIsLoadingTickets(true);
    }
    setError(null);

    try {
      const response = await adminChatService.getAllTickets();
      if (Array.isArray(response)) {
        const normalizedTickets = response.map((t) => ({
          ...t,
          id: t._id || t.id,
        }));

        // Deep comparison to check if tickets have actually changed
        setTickets((prevTickets) => {
          const prevString = JSON.stringify(prevTickets);
          const newString = JSON.stringify(normalizedTickets);
          if (prevString !== newString) {
            console.log("Tickets updated, applying new data.");
            return normalizedTickets;
          }
          console.log("No changes detected in tickets.");
          return prevTickets; // Return previous state to avoid re-render
        });
      } else {
        setError("Invalid data format for tickets.");
        setTickets([]);
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError("Failed to load tickets. Please try again later.");
      setTickets([]);
    } finally {
      if (tickets.length === 0) {
        setIsLoadingTickets(false);
      }
    }
  }, [tickets.length]); // Depend on tickets.length to handle initial load correctly

  useEffect(() => {
    fetchTickets(); // Initial load
    const intervalId = setInterval(() => {
      console.log("Polling tickets...");
      fetchTickets();
    }, 3000);

    // Cleanup on unmount
    return () => {
      console.log("Clearing ticket polling interval");
      clearInterval(intervalId);
    };
  }, [fetchTickets]);

  const selectedTicket = tickets.find(
    (ticket) => ticket.id === selectedTicketId
  );

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTicket?.messages]);

  const formatDate = (dateString) => {
    if (!dateString) return "Invalid Date";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return "Invalid Date";
    }
  };

  const handleSendAdminMessage = async () => {
    if (!newMessage.trim() || !selectedTicketId || isSending) return;
    setIsSending(true);
    const optimisticId = `optimistic-${Date.now()}`;
    const contentToSend = newMessage;
    const optimisticMessage = {
      id: optimisticId,
      user_id: selectedTicket?.user_id || "unknown",
      is_admin: true,
      admin_name: "Admin",
      content: contentToSend,
      created_at: new Date().toISOString(),
      optimistic: true,
    };

    setTickets((prevTickets) =>
      prevTickets.map((ticket) => {
        if (ticket.id === selectedTicketId) {
          return {
            ...ticket,
            messages: [...(ticket.messages || []), optimisticMessage],
          };
        }
        return ticket;
      })
    );
    setNewMessage("");

    try {
      const savedMessage = await adminChatService.addAdminMessage(
        selectedTicketId,
        contentToSend
      );
      setTickets((prevTickets) =>
        prevTickets.map((ticket) => {
          if (ticket.id === selectedTicketId) {
            return {
              ...ticket,
              messages: (ticket.messages || []).map((msg) =>
                msg.id === optimisticId
                  ? { ...savedMessage, optimistic: false }
                  : msg
              ),
              updated_at: savedMessage.created_at,
            };
          }
          return ticket;
        })
      );
    } catch (error) {
      console.error("Error sending admin message:", error);
      setTickets((prevTickets) =>
        prevTickets.map((ticket) => {
          if (ticket.id === selectedTicketId) {
            return {
              ...ticket,
              messages: (ticket.messages || []).map((msg) =>
                msg.id === optimisticId
                  ? { ...msg, error: true, optimistic: false }
                  : msg
              ),
            };
          }
          return ticket;
        })
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicketId || isUpdatingTicket) return;
    setIsUpdatingTicket(true);
    try {
      const closedTicket = await adminChatService.closeTicket(selectedTicketId);
      setTickets((prevTickets) =>
        prevTickets.map((ticket) =>
          ticket.id === selectedTicketId
            ? { ...ticket, status: closedTicket.status }
            : ticket
        )
      );
      toast.success("Ticket closed successfully.");
    } catch (error) {
      console.error("Error closing ticket:", error);
      toast.error("Failed to close ticket.");
    } finally {
      setIsUpdatingTicket(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!selectedTicketId || isUpdatingTicket) return;
    setIsUpdatingTicket(true);
    try {
      const reopenedTicket = await adminChatService.reopenTicket(
        selectedTicketId
      );
      setTickets((prevTickets) =>
        prevTickets.map((ticket) =>
          ticket.id === selectedTicketId
            ? { ...ticket, status: reopenedTicket.status }
            : ticket
        )
      );
      toast.success("Ticket reopened successfully.");
    } catch (error) {
      console.error("Error reopening ticket:", error);
      toast.error("Failed to reopen ticket.");
    } finally {
      setIsUpdatingTicket(false);
    }
  };

  return (
    <div
      className="admin-chat-container"
      style={{ overflow: "-moz-hidden-unscrollable" }}
    >
      <div
        className="admin-chat-sidebar"
        style={{ height: "calc(100vh - 80px)", marginRight: "1rem" }}
      >
        <h2>Support Tickets</h2>
        {isLoadingTickets ? (
          <div className="loading-placeholder">
            <FiLoader className="spinner" size={24} />
            <span>Loading tickets...</span>
          </div>
        ) : error ? (
          <div className="error-placeholder">
            <FiAlertCircle size={24} />
            <span>{error}</span>
            <button onClick={fetchTickets}>Retry</button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-placeholder">
            <FiInfo size={24} />
            <span>No tickets found.</span>
          </div>
        ) : (
          <div className="tickets-list">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`ticket-item ${
                  selectedTicketId === ticket.id ? "active" : ""
                } ${ticket.status}`}
                onClick={() => setSelectedTicketId(ticket.id)}
              >
                <div className="ticket-item-content">
                  <div className="ticket-title">
                    {ticket.title || "No Title"}
                  </div>
                  <div className="ticket-meta">
                    <span className={`ticket-status ${ticket.status}`}>
                      {ticket.status}
                    </span>
                    <span className="ticket-date">
                      {formatDate(ticket.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="admin-chat-main" style={{ flex: 1 }}>
        {selectedTicket ? (
          <>
            <div className="admin-chat-header">
              <div className="admin-chat-info">
                <h2>{selectedTicket.title || "No Title"}</h2>
                <div className="admin-chat-meta">
                  <span className={`ticket-status ${selectedTicket.status}`}>
                    {selectedTicket.status}
                  </span>
                  <span className="ticket-date">
                    Created: {formatDate(selectedTicket.created_at)}
                  </span>
                  {selectedTicket.updated_at !== selectedTicket.created_at && (
                    <span className="ticket-date">
                      Updated: {formatDate(selectedTicket.updated_at)}
                    </span>
                  )}
                </div>
              </div>
              <div className="admin-chat-actions">
                {selectedTicket.status !== "closed" ? (
                  <button
                    className="close-reopen-button"
                    onClick={handleCloseTicket}
                    disabled={isUpdatingTicket}
                    title="Close Ticket"
                  >
                    <FiX size={16} />
                    {isUpdatingTicket ? (
                      <FiLoader className="spinner" size={16} />
                    ) : (
                      "Close Ticket"
                    )}
                  </button>
                ) : (
                  <button
                    className="close-reopen-button"
                    onClick={handleReopenTicket}
                    disabled={isUpdatingTicket}
                    title="Reopen Ticket"
                  >
                    <FiRepeat size={16} />
                    {isUpdatingTicket ? (
                      <FiLoader className="spinner" size={16} />
                    ) : (
                      "Reopen Ticket"
                    )}
                  </button>
                )}
              </div>
            </div>
            <div className="admin-chat-messages">
              {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                selectedTicket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${
                      message.is_admin ? "admin-message" : "user-message"
                    } ${message.optimistic ? "optimistic" : ""} ${
                      message.error ? "error" : ""
                    }`}
                  >
                    <div className="message-content">
                      {message.content || ""}
                    </div>
                    <div className="message-meta">
                      {message.is_admin && message.admin_name && (
                        <span className="admin-name">{message.admin_name}</span>
                      )}
                      <span className="message-time">
                        {formatDate(message.created_at)}
                      </span>
                      {message.error && (
                        <FiAlertCircle className="error-icon" size={12} />
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-messages">
                  <FiMessageCircle
                    size={48}
                    style={{ marginBottom: "1rem", opacity: 0.7 }}
                  />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="admin-chat-input">
              {selectedTicket.status === "closed" ? (
                <div className="ticket-closed-message">
                  <FiAlertCircle size={20} />
                  <span>
                    This ticket is closed. Reopen it to send messages.
                  </span>
                </div>
              ) : (
                <>
                  <textarea
                    placeholder="Type your message here..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isSending}
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendAdminMessage();
                      }
                    }}
                  />
                  <button
                    className="send-button"
                    onClick={handleSendAdminMessage}
                    disabled={!newMessage.trim() || isSending}
                  >
                    {isSending ? (
                      <FiLoader className="spinner" size={20} />
                    ) : (
                      <FiSend size={20} />
                    )}
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <FiMessageCircle
              size={48}
              style={{ marginBottom: "1rem", opacity: 0.7 }}
            />
            <h2>Manage Support Tickets</h2>
            <p>
              Select a ticket to view details and communicate with the user.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const UserEditModal = ({
  user: userToEdit,
  currentAdminUser,
  onClose,
  onSave,
  isLoading,
}) => {
  const [formData, setFormData] = useState({
    username: userToEdit?.username || "",
    email: userToEdit?.email || "",
    role: userToEdit?.role || "user",
  });
  const isEditingSelf = currentAdminUser?.id === userToEdit?.id;
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.email || !formData.role) {
      toast.error("Email and Role are required.");
      return;
    }
    if (isEditingSelf && formData.role !== currentAdminUser?.role) {
      toast.error("You cannot change your own role from this modal.");
      return;
    }
    onSave(formData);
  };
  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h3>Edit User ({userToEdit?.username})</h3>
            <button
              type="button"
              className="close-button"
              onClick={onClose}
              disabled={isLoading}
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
                name="username"
                className="form-input"
                value={formData.username}
                readOnly
                disabled
              />
              <small>Username cannot be changed.</small>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="role">Role *</label>
              <select
                id="role"
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleChange}
                required
                disabled={isLoading || isEditingSelf}
              >
                <option value="user">User</option>
                <option value="technician">Technician</option>
                <option value="admin">Administrator</option>
              </select>
              {isEditingSelf && <small>You cannot change your own role.</small>}
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={isLoading}>
              {isLoading ? <FiLoader className="spin-icon" /> : "Update User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LLMAddModal = ({ onClose, onAdd, isLoading }) => {
  const [formData, setFormData] = useState({
    model_id: "",
    model_type: "llama",
    model_url: "",
    file_name: "",
    context_window: 2048,
    n_threads: 4,
    n_gpu_layers: 0,
    temperature: 0.7,
    keep_file_on_error: false,
    auto_correct_type: true,
    download_only: false,
  });
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.model_id) {
      toast.error("Model ID is required.");
      return;
    }
    if (!formData.model_url && !formData.file_name) {
      toast.error("Either Model URL or File Name must be provided.");
      return;
    }
    if (formData.model_url && formData.file_name) {
      toast.warn("Provide either Model URL or File Name, not both. Using URL.");
    }
    const payload = {
      ...formData,
      context_window: Number(formData.context_window) || 2048,
      n_threads: Number(formData.n_threads) || 4,
      n_gpu_layers: Number(formData.n_gpu_layers) || 0,
      temperature: parseFloat(formData.temperature) || 0.7,
    };
    onAdd(payload);
  };
  return (
    <div className="modal-backdrop">
      <div className="modal-container large">
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h3>Add New LLM Configuration</h3>
            <button
              type="button"
              className="close-button"
              onClick={onClose}
              disabled={isLoading}
            >
              ×
            </button>
          </div>
          <div className="modal-body llm-modal-body">
            <div className="form-group required">
              <label htmlFor="model_id">Model ID *</label>
              <input
                type="text"
                id="model_id"
                name="model_id"
                className="form-input"
                value={formData.model_id}
                onChange={handleChange}
                required
                disabled={isLoading}
                placeholder="Unique identifier (e.g., llama3-8b-instruct)"
              />
              <small>A unique name for this model configuration.</small>
            </div>
            <div className="form-group required">
              <label>Model Source *</label>
              <div className="source-options">
                <div className="form-group">
                  <label htmlFor="model_url">Model URL</label>
                  <input
                    type="url"
                    id="model_url"
                    name="model_url"
                    className="form-input"
                    value={formData.model_url}
                    onChange={handleChange}
                    disabled={isLoading || !!formData.file_name}
                    placeholder="https://huggingface.co/.../gguf-quant.bin"
                  />
                  <small>
                    URL to download the model from (e.g., Hugging Face).
                  </small>
                </div>
                <span className="or-divider">OR</span>
                <div className="form-group">
                  <label htmlFor="file_name">File Name / Path</label>
                  <input
                    type="text"
                    id="file_name"
                    name="file_name"
                    className="form-input"
                    value={formData.file_name}
                    onChange={handleChange}
                    disabled={isLoading || !!formData.model_url}
                    placeholder="/path/on/server/model.gguf"
                  />
                  <small>Path to the model file.</small>
                </div>
              </div>
              <small className="required-hint">
                Provide either a URL or a server file path.
              </small>
            </div>
            <div className="form-group">
              <label htmlFor="model_type">Model Type</label>
              <select
                id="model_type"
                name="model_type"
                className="form-select"
                value={formData.model_type}
                onChange={handleChange}
                disabled={isLoading}
              >
                <option value="llama">Llama (GGUF)</option>
              </select>
              <small>Type of the model architecture.</small>
            </div>
            <h4 className="config-header">Configuration Parameters</h4>
            <div className="config-grid">
              <div className="form-group">
                <label htmlFor="context_window">Context Window</label>
                <input
                  type="number"
                  id="context_window"
                  name="context_window"
                  className="form-input"
                  value={formData.context_window}
                  onChange={handleChange}
                  min="1"
                  step="1"
                  disabled={isLoading}
                  placeholder="e.g., 2048"
                />
              </div>
              <div className="form-group">
                <label htmlFor="n_threads">CPU Threads</label>
                <input
                  type="number"
                  id="n_threads"
                  name="n_threads"
                  className="form-input"
                  value={formData.n_threads}
                  onChange={handleChange}
                  min="1"
                  step="1"
                  disabled={isLoading}
                  placeholder="e.g., 4"
                />
              </div>
              <div className="form-group">
                <label htmlFor="n_gpu_layers">GPU Layers</label>
                <input
                  type="number"
                  id="n_gpu_layers"
                  name="n_gpu_layers"
                  className="form-input"
                  value={formData.n_gpu_layers}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  disabled={isLoading}
                  placeholder="e.g., 0 (CPU) or 35"
                />
                <small>
                  Number of layers to offload to GPU (if available).
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="temperature">Temperature</label>
                <input
                  type="number"
                  id="temperature"
                  name="temperature"
                  className="form-input"
                  value={formData.temperature}
                  onChange={handleChange}
                  min="0"
                  max="2"
                  step="0.1"
                  disabled={isLoading}
                  placeholder="e.g., 0.7"
                />
              </div>
            </div>
            <h4 className="config-header">Advanced Options</h4>
            <div className="checkbox-group">
              <label htmlFor="keep_file_on_error">
                <input
                  type="checkbox"
                  id="keep_file_on_error"
                  name="keep_file_on_error"
                  checked={formData.keep_file_on_error}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                Keep downloaded file on error
              </label>
            </div>
            <div className="checkbox-group">
              <label htmlFor="auto_correct_type">
                <input
                  type="checkbox"
                  id="auto_correct_type"
                  name="auto_correct_type"
                  checked={formData.auto_correct_type}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                Auto-correct model type (if possible)
              </label>
            </div>
            <div className="checkbox-group">
              <label htmlFor="download_only">
                <input
                  type="checkbox"
                  id="download_only"
                  name="download_only"
                  checked={formData.download_only}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                Download only (do not load into memory yet)
              </label>
              <small>
                If checked, the model will be downloaded but not immediately
                loaded for use.
              </small>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={isLoading}>
              {isLoading ? <FiLoader className="spin-icon" /> : "Add LLM"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;
