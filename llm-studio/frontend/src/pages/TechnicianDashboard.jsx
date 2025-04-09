import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiCpu,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiRefreshCw,
  FiLoader,
  FiDownloadCloud,
  FiFileText,
  FiLogOut,
  FiUser,
  FiEdit,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import "./AdminDashboard.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
const API_V1_STR = "/api";

const fetchApi = async (url, token, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  try {
    const fullUrl = `${API_BASE_URL}${API_V1_STR}${url}`;
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

const LLMModifyModal = ({ llm, onClose, onModify, isLoading }) => {
  const [formData, setFormData] = useState({
    temperature: llm.temperature ?? 0.7,
    context_window: llm.context_window ?? 2048,
    n_threads: llm.n_threads ?? 4,
    n_gpu_layers: llm.n_gpu_layers ?? 0,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === "" ? "" : Number(value),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      temperature:
        formData.temperature !== "" ? parseFloat(formData.temperature) : null,
      context_window:
        formData.context_window !== "" ? Number(formData.context_window) : null,
      n_threads: formData.n_threads !== "" ? Number(formData.n_threads) : null,
      n_gpu_layers:
        formData.n_gpu_layers !== "" ? Number(formData.n_gpu_layers) : null,
    };
    onModify(llm.id, payload);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h3>Modify LLM: {llm.model_id}</h3>
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
            <div className="config-grid">
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
                <small>Controls randomness (0-2).</small>
              </div>
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
                <small>Max tokens for context.</small>
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
                <small>Threads for CPU processing.</small>
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
                <small>Layers to offload to GPU.</small>
              </div>
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
              {isLoading ? <FiLoader className="spin-icon" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TechnicianDashboard = () => {
  const [llms, setLlms] = useState([]);
  const [isLoading, setIsLoading] = useState({ llms: false });
  const [isMutating, setIsMutating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLLMModal, setShowLLMModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(null);

  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const authToken = user?.token || localStorage.getItem("token");

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

  useEffect(() => {
    if (
      !authLoading &&
      user &&
      user.role !== "technician" &&
      user.role !== "admin"
    ) {
      toast.warn("Access denied. Redirecting to your dashboard.");
      navigate("/dashboard");
      return;
    }
    if (authToken && user && (user.role === "technician" || user.role === "admin")) {
      loadLLMs();
    } else if (!authLoading && !authToken) {
      toast.info("Please log in to access the technician area.");
      navigate("/login");
    }
  }, [authToken, user, authLoading, loadLLMs, navigate]);

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
        await loadLLMs();
      } finally {
        setIsMutating(false);
      }
    }
  };

  const handleModifyLLM = async (modelId, modifyData) => {
    if (!authToken) {
      toast.error("Authentication required to modify models.");
      return;
    }
    setIsMutating(true);
    try {
      const response = await fetchApi(`/llm-manager/models/${modelId}`, authToken, {
        method: "PUT",
        body: JSON.stringify(modifyData),
      });
      setLlms((prevLlms) =>
        prevLlms.map((llm) =>
          llm.id === modelId
            ? { ...llm, ...response.updated_model_info }
            : llm
        )
      );
      setShowModifyModal(null);
      toast.success(`LLM '${modelId}' modified successfully.`);
    } catch (error) {
      toast.error(`Failed to modify LLM: ${error.message}`);
      await loadLLMs();
    } finally {
      setIsMutating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredLLMs = llms.filter(
    (llm) =>
      llm.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      llm.model_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      llm.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      llm.path?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSectionLoading = isLoading.llms;

  if (authLoading) {
    return (
      <div className="loading-spinner">
        <FiLoader className="spin-icon" /> Loading Authentication...
      </div>
    );
  }

  if (!user || (user.role !== "technician" && user.role !== "admin")) {
    return (
      <div className="loading-spinner">
        <FiLoader className="spin-icon" /> Verifying access...
      </div>
    );
  }

  return (
    <div className="technician-dashboard">
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
              LLM Studio <span className="admin-subtitle">Technician</span>
            </h1>
          </div>
        </div>
        <div className="admin-header-right">
          <div className="admin-search">
            <input
              type="text"
              placeholder="Search LLMs..."
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

      <div className="admin-content technician-content">
        <main className="admin-main full-width">
          {isSectionLoading || isMutating ? (
            <div className="loading-spinner">
              <FiLoader className="spin-icon" />{" "}
              {isMutating ? "Processing..." : "Loading LLMs..."}
            </div>
          ) : (
            <section className="admin-section">
              <div className="section-header">
                <h2 className="section-title">LLM Management</h2>
                <div>
                  <button
                    className="action-button refresh-button"
                    onClick={loadLLMs}
                    disabled={isLoading.llms || isMutating}
                    style={{ marginRight: "10px" }}
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
                {filteredLLMs.length === 0 ? (
                  <div className="no-data-message centered-message">
                    <FiCpu size={48} />
                    <h3>No LLMs Configured</h3>
                    <p>
                      {searchTerm
                        ? "No models found matching your search."
                        : "Use the 'Add LLM' button to configure a new model."}
                    </p>
                    <button
                      className="action-button"
                      onClick={handleOpenAddLLMModal}
                      disabled={isMutating}
                      style={{ marginTop: "15px" }}
                    >
                      <FiPlus /> Add LLM
                    </button>
                  </div>
                ) : (
                  filteredLLMs.map((llm) => (
                    <div key={llm.id} className="llm-card">
                      <div className="llm-card-header">
                        <h3 className="llm-name">{llm.model_id || llm.id}</h3>
                        <div className="llm-actions">
                          <button
                            className="action-icon edit-icon"
                            onClick={() => setShowModifyModal(llm)}
                            title="Modify LLM"
                            disabled={isMutating}
                          >
                            <FiEdit />
                          </button>
                          <button
                            className="action-icon delete-icon"
                            onClick={() => handleDeleteLLM(llm.id)}
                            title="Delete LLM"
                            disabled={isMutating}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
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
                            {llm.path?.length > 50
                              ? `${llm.path.substring(0, 47)}...`
                              : llm.path || "N/A"}
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
                        {llm.backend && (
                          <div className="llm-detail">
                            <span className="detail-label">Backend:</span>
                            <span className="detail-value">{llm.backend}</span>
                          </div>
                        )}
                        {llm.size_mb && (
                          <div className="llm-detail">
                            <span className="detail-label">Size (MB):</span>
                            <span className="detail-value">
                              {llm.size_mb.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {showLLMModal && (
        <LLMAddModal
          onClose={() => setShowLLMModal(false)}
          onAdd={handleAddLLM}
          isLoading={isMutating}
        />
      )}
      {showModifyModal && (
        <LLMModifyModal
          llm={showModifyModal}
          onClose={() => setShowModifyModal(null)}
          onModify={handleModifyLLM}
          isLoading={isMutating}
        />
      )}
    </div>
  );
};

export default TechnicianDashboard;