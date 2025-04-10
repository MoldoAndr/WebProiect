import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSend,
  FiArrowLeft,
  FiInfo,
  FiAlertCircle,
  FiMessageCircle,
  FiLoader,
  FiX,
  FiRepeat,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { adminChatService } from "../services/admin-chat.service";
import { toast } from "react-toastify";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import "./AdminChat.css";

const AdminChatAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingTicket, setIsUpdatingTicket] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const firstLoadRef = useRef(true);

  const fetchTickets = useCallback(async () => {
    setIsLoadingTickets(true);
    setError(null);
    try {
      const response = await adminChatService.getAllTickets();
      if (Array.isArray(response)) {
        const normalizedTickets = response.map((t) => ({
          ...t,
          id: t._id || t.id,
        }));
        setTickets(normalizedTickets);
      } else {
        setError("Invalid data format for tickets.");
        setTickets([]);
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError("Failed to load tickets. Please try again later.");
      setTickets([]);
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);
  useEffect(() => {
    // Initial fetch
    fetchTickets();

    // Set up polling interval
    const intervalId = setInterval(() => {
      console.log("Polling tickets..."); // Debug log to confirm polling
      fetchTickets();
    }, 3000);

    // Cleanup interval on unmount
    return () => {
      console.log("Cleaning up interval"); // Debug log to confirm cleanup
      clearInterval(intervalId);
    };
  }, [fetchTickets]); // fetchTickets as dependency ensures it’s stable

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

  const handleBackToDashboard = () => {
    navigate("/dashboard");
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
      admin_name: user?.full_name || user?.username,
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
      toast.error("Failed to send message. Please try again.");
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
    <div className="dashboard-container">
      <DashboardHeader user={user} />
      <div className="admin-chat-container">
        <div
          className="admin-chat-sidebar"
          style={{
            height: "calc(100vh - 80px)",
            marginTop: "15px",
            marginLeft: "15px",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #2d3748",
              backgroundColor: "rgba(26, 32, 44, 0.6)",
              borderTopLeftRadius: "8px",
              borderTopRightRadius: "8px",
              flexShrink: 0,
            }}
          >
            <button onClick={handleBackToDashboard} className="back-button">
              <FiArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </button>
          </div>
          <div className="admin-chat-sidebar-header" style={{ flexShrink: 0 }}>
            <h2>All Support Tickets</h2>
          </div>
          <div
            className="tickets-list"
            style={{ flexGrow: 1, overflowY: "auto" }}
          >
            {firstLoadRef.current && isLoadingTickets ? (
              <div className="loading-placeholder">
                <FiLoader className="spinner" size={24} />
                <span>Loading tickets...</span>
              </div>
            ) : error ? (
              <div className="error-placeholder">
                <FiAlertCircle size={24} />
                <span>{error}</span>
                <button onClick={fetchTickets} className="retry-button">
                  Retry
                </button>
              </div>
            ) : tickets.length === 0 ? (
              <div className="empty-placeholder">
                <FiInfo size={24} />
                <span>No tickets found.</span>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`ticket-item ${
                    selectedTicketId === ticket.id ? "active" : ""
                  } ${ticket.status}`}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" && setSelectedTicketId(ticket.id)
                  }
                >
                  <div className="ticket-item-content">
                    <div className="ticket-title">
                      {String(ticket.title ?? "No Title")}
                    </div>
                    <div className="ticket-meta">
                      <span className={`ticket-status ${ticket.status}`}>
                        {ticket.status}
                      </span>
                      <span className="ticket-date">
                        {formatDate(ticket.updated_at || ticket.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="admin-chat-main">
          {selectedTicket ? (
            <>
              <div className="admin-chat-header">
                <div className="admin-chat-info">
                  <h2>{String(selectedTicket.title ?? "No Title")}</h2>
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
                {!selectedTicket.messages ||
                selectedTicket.messages.length === 0 ? (
                  <div className="no-messages">
                    <FiInfo size={48} />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  selectedTicket.messages.map((message) => {
                    const isNewMessage = !!message.optimistic;
                    return (
                      <div
                        key={message.id}
                        className={`message ${
                          message.is_admin ? "admin-message" : "user-message"
                        } ${message.optimistic ? "optimistic" : ""} ${
                          message.error ? "error" : ""
                        } ${isNewMessage ? "new-message" : ""}`}
                        title={message.error ? "Failed to send" : ""}
                      >
                        <div className="message-content">
                          {String(message.content ?? "")}
                        </div>
                        <div className="message-meta">
                          {message.is_admin && message.admin_name && (
                            <span className="admin-name">
                              {message.admin_name}
                            </span>
                          )}
                          <span className="message-time">
                            {formatDate(message.created_at)}
                          </span>
                          {message.error && (
                            <FiAlertCircle className="error-icon" size={12} />
                          )}
                        </div>
                      </div>
                    );
                  })
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
              <p>Select a ticket to view details and communicate with the user.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChatAdmin;