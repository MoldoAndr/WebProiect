import React, { useState, useEffect, useCallback } from "react";
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
  FiDownloadCloud, // Added icon for model source type
  FiFileText, // Added icon for model source type
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import "./AdminDashboard.css";
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
const API_V1_STR = "/api"; // Defined API prefix
/**
 * Helper function for making authenticated API calls.
 * @param {string} url - The API endpoint path (e.g., "/users") *relative to API_V1_STR*
 * @param {string | null} token - The JWT authentication token.
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<any>} - The JSON response from the API.
 */
const fetchApi = async (url, token, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  try {
    const fullUrl = `${API_BASE_URL}${API_V1_STR}${url}`; // Construct full URL
    // console.log(`Fetching: ${options.method || 'GET'} ${fullUrl}`); // Debugging fetch calls
    // if (options.body) {
    //   console.log('Fetch Body:', options.body);
    // }
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });
    let responseBody;
    const contentType = response.headers.get("content-type");
    // Handle different response types
    if (contentType && contentType.indexOf("application/json") !== -1) {
      if (
        response.status === 204 ||
        response.headers.get("content-length") === "0"
      ) {
        responseBody = null; // No content
      } else {
        responseBody = await response.json(); // Attempt to parse JSON
      }
    } else {
      // Handle non-JSON responses if necessary, e.g., text
      if (
        response.status !== 204 &&
        response.headers.get("content-length") !== "0"
      ) {
        responseBody = await response.text();
      } else {
        responseBody = null;
      }
    }
    // Check for errors after attempting to read the body
    if (!response.ok) {
      let errorDetail = `HTTP error! status: ${response.status}`;
      // If responseBody has detail (common FastAPI error format)
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
        // Use text response as detail if available
        errorDetail = responseBody;
      }
      console.error("API Error Response:", response.status, responseBody);
      throw new Error(errorDetail);
    }
    // console.log(`Fetch Success: ${options.method || 'GET'} ${fullUrl}`, responseBody); // Debugging success
    return responseBody; // Return parsed body or null
  } catch (error) {
    // Log and re-throw for component-level handling
    console.error(
      `Fetch API Error (${options.method || "GET"} ${url}):`,
      error
    );
    // Make sure error message is useful
    throw new Error(error.message || "An unknown API error occurred.");
  }
};
const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const [users, setUsers] = useState([]);
  const [llms, setLlms] = useState([]); // State for LLM models
  const [isLoading, setIsLoading] = useState({
    users: false,
    llms: false,
    overview: false, // Might be needed if overview involves API calls later
  });
  const [isMutating, setIsMutating] = useState(false); // For Add/Delete operations
  const [showUserModal, setShowUserModal] = useState(false);
  const [showLLMModal, setShowLLMModal] = useState(false); // Modal for adding LLMs
  const [currentUser, setCurrentUser] = useState(null); // For editing users
  // Removed currentLLM state as editing isn't supported by backend API
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
      setUsers(fetchedUsers.map((u) => ({ ...u, id: u.id || u._id }))); // Ensure 'id' field
    } catch (error) {
      toast.error(`Failed to load users: ${error.message}`);
      setUsers([]); // Clear on error
    } finally {
      setIsLoading((prev) => ({ ...prev, users: false }));
    }
  }, [authToken]);
  const loadLLMs = useCallback(async () => {
    // Comments about auth remain relevant for Add/Delete
    setIsLoading((prev) => ({ ...prev, llms: true }));
    try {
      // Fetches from GET /llm-manager/models
      const fetchedLLMsData = await fetchApi("/llm-manager/models", null); // No token needed
      // --- Data Transformation ---
      let processedLlms = []; // Initialize empty array for state
      // Check if the fetched data is a non-null object (and not an array)
      if (
        fetchedLLMsData &&
        typeof fetchedLLMsData === "object" &&
        !Array.isArray(fetchedLLMsData)
      ) {
        // Use Object.values() to get an array of the model detail objects
        // Then map over this array to create the structure needed for the state
        processedLlms = Object.values(fetchedLLMsData).map((llmDetails) => ({
          // Extract fields from the value object (llmDetails)
          id: llmDetails.id, // The ID is present inside the value object
          model_id: llmDetails.id, // Keep consistent if needed elsewhere
          type: llmDetails.type || "unknown",
          path: llmDetails.model_path || "N/A", // Map model_path from backend
          context_window: llmDetails.context_window,
          n_threads: llmDetails.n_threads,
          n_gpu_layers: llmDetails.n_gpu_layers,
          temperature: llmDetails.temperature,
          // Include other potentially useful fields from the response
          backend: llmDetails.backend,
          device_info: llmDetails.device_info,
          size_mb: llmDetails.size_mb,
        }));
        setLlms(processedLlms); // Update the state with the processed array
      } else {
        // Handle cases where the response is not the expected object format
        console.warn(
          "Received unexpected data format for LLMs:",
          fetchedLLMsData
        );
        setLlms([]); // Set to empty array
        // Optionally show a more specific warning to the user
        toast.warn("Could not parse LLM model data from the server.");
      }
    } catch (error) {
      toast.error(`Failed to load LLMs: ${error.message}`);
      setLlms([]); // Clear on error
    } finally {
      setIsLoading((prev) => ({ ...prev, llms: false }));
    }
  }, []); // Dependency array is empty as fetchApi and setters are stable
  // --- Initial Load and Auth Check ---
  useEffect(() => {
    // Redirect non-admins or unauthenticated users
    if (!authLoading && user && user.role !== "admin") {
      toast.warn("Access denied. Redirecting to your dashboard.");
      const destination =
        user.role === "technician" ? "/technician-dashboard" : "/dashboard";
      navigate(destination);
      return; // Prevent further execution
    }
    // Load data only if authenticated as admin
    if (authToken && user?.role === "admin") {
      loadUsers();
      loadLLMs();
    } else if (!authLoading && !authToken) {
      console.log("Admin Dashboard: Not authenticated. Redirecting to login.");
      toast.info("Please log in to access the admin area.");
      navigate("/login");
    }
    // Dependencies: authToken, user object (and its role), authLoading state, loading functions, navigate
  }, [authToken, user, authLoading, loadUsers, loadLLMs, navigate]);
  // --- User Management Handlers (Unchanged as requested) ---
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
    // No currentLLM needed for adding
    setShowLLMModal(true);
  };
  // Function to add a new LLM model
  const handleAddLLM = async (llmData) => {
    if (!authToken) {
      toast.error("Authentication required to add models.");
      return;
    }
    setIsMutating(true);
    try {
      // Prepare payload according to AddModelRequest Pydantic model
      const payload = {
        model_id: llmData.model_id,
        model_type: llmData.model_type || "llama", // Default if not provided
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
      // Basic validation: Need either URL or FileName/Path
      if (!payload.model_url && !payload.file_name) {
        throw new Error("Either Model URL or File Name/Path must be provided.");
      }
      // Call the POST /llm-manager/models endpoint
      // Assuming the add_model service returns the representation of the added/loading model
      const addedLLMInfo = await fetchApi("/llm-manager/models", authToken, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      // Optimistically update the UI or reload list
      // The backend might return details of the model being added/downloaded
      // For simplicity, just reload the list for now to see the new model status
      await loadLLMs(); // Reload the list to show the newly added model
      setShowLLMModal(false); // Close modal on success
      toast.success(
        `LLM '${payload.model_id}' added successfully (or download initiated).`
      );
    } catch (error) {
      toast.error(`Failed to add LLM: ${error.message}`);
      // Keep modal open on error? Optional.
      // setShowLLMModal(false);
    } finally {
      setIsMutating(false);
    }
  };
  // Function to delete an LLM model
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
  // --- Other Handlers ---
  const handleLogout = () => {
    logout();
    navigate("/login"); // Redirect to login after logout
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
  // --- Derived State for Overview ---
  const activeUserCount = users.filter((u) => u.is_active).length;
  const totalUserCount = users.length;
  // LLM status isn't directly managed via API, so 'active' count might be just the total count.
  // Or, if the backend /models endpoint only returns *loaded* models, this count is accurate.
  const totalLLMCount = llms.length;
  const isSectionLoading = isLoading.users || isLoading.llms;
  // --- Render Logic ---
  // Loading state or redirect state
  if (authLoading) {
    return (
      <div className="loading-spinner">
        <FiLoader className="spin-icon" /> Loading Authentication...
      </div>
    );
  }
  // Redirect check happens in useEffect, but this prevents rendering if not admin yet
  if (!user || user.role !== "admin") {
    // Display minimal loading or nothing while redirect occurs
    return (
      <div className="loading-spinner">
        <FiLoader className="spin-icon" /> Verifying access...
      </div>
    );
  }
  // Main Admin Dashboard Render
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
                    <h2 className="section-title">LLM Management</h2>
                    <div>
                      <button
                        className="action-button refresh-button"
                        onClick={loadLLMs}
                        disabled={isLoading.llms}
                        style={{ marginRight: "10px", marginTop: "10px" }}
                      >
                        <FiRefreshCw
                          className={isLoading.llms ? "spin-icon" : ""}
                        />{" "}
                        Refresh LLMs
                      </button>
                      <button
                        className="action-button"
                        onClick={handleOpenAddLLMModal}
                        disabled={isMutating}
                      >
                        <FiPlus /> Add LLM
                      </button>
                    </div>
                  </div>
                  <div className="llm-cards">
                    {filteredLLMs.map((llm) => (
                      <div key={llm.id} className="llm-card">
                        <div className="llm-card-header">
                          <h3 className="llm-name">{llm.model_id || llm.id}</h3>
                          <div className="llm-actions">
                            <button
                              className="action-icon delete-icon"
                              onClick={() => handleDeleteLLM(llm.id)} // Use the main unique ID for deletion
                              title="Delete LLM"
                              disabled={isMutating}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>
                        <div className="llm-provider">
                          {" "}
                          <span className="provider-label">Type:</span>
                          <span className="provider-value">{llm.type}</span>
                        </div>
                        <div className="llm-details">
                          <div className="llm-detail endpoint">
                            {" "}
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
        <LLMAddModal // Changed name for clarity
          onClose={() => {
            setShowLLMModal(false);
          }}
          onAdd={handleAddLLM} // Use the add handler
          isLoading={isMutating}
        />
      )}
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
/**
 * Modal component for adding new LLM configurations.
 * Fields match the AddModelRequest Pydantic model.
 */
const LLMAddModal = ({ onClose, onAdd, isLoading }) => {
  // Initialize state based on AddModelRequest defaults
  const [formData, setFormData] = useState({
    model_id: "",
    model_type: "llama", // Default type
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
      // Handle checkboxes vs other inputs
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
    // Validation: Ensure required fields are present
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
      // Optionally clear file_name if URL is prioritized
      // formData.file_name = '';
    }
    // Ensure numeric fields are numbers or default if empty
    const payload = {
      ...formData,
      context_window: Number(formData.context_window) || 2048,
      n_threads: Number(formData.n_threads) || 4,
      n_gpu_layers: Number(formData.n_gpu_layers) || 0,
      temperature: parseFloat(formData.temperature) || 0.7,
    };
    onAdd(payload); // Pass the processed data to the handler
  };
  return (
    <div className="modal-backdrop">
      <div className="modal-container large">
        {" "}
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
            {" "}
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
                  <small>Path to the model file *on the server*.</small>
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
