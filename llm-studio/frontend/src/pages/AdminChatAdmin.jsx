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
import "./AdminChatAdmin.css"; // Ensure this file exists and styles the admin chat page

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

  // Fetch all tickets using the admin endpoint
  const fetchTickets = useCallback(async () => {
    setIsLoadingTickets(true);
    setError(null);
    try {
      const response = await adminChatService.getAdminTickets();
      if (Array.isArray(response)) {
        const normalizedTickets = response.map((t) => ({
          ...t,
          id: t._id || t.id,
        }));
        setTickets(normalizedTickets);
      } else {
        setError("Invalid data format for tickets.");
        setTickets([]);
        toast.error("Failed to load tickets: Invalid data format.");
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError("Failed to load tickets. Please try again later.");
      setTickets([]);
      toast.error("Failed to load tickets.");
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId);

  // Scroll to bottom on messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTicket?.messages]);

  // Helper function to format dates
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

  // Handle sending an admin message
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

    // Optimistic UI update
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
      // Replace the optimistic message with the server response
      setTickets((prevTickets) =>
        prevTickets.map((ticket) => {
          if (ticket.id === selectedTicketId) {
            return {
              ...ticket,
              messages: (ticket.messages || []).map((msg) =>
                msg.id === optimisticId ? { ...savedMessage, optimistic: false } : msg
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
      // Mark the optimistic message as error
      setTickets((prevTickets) =>
        prevTickets.map((ticket) => {
          if (ticket.id === selectedTicketId) {
            return {
              ...ticket,
              messages: (ticket.messages || []).map((msg) =>
                msg.id === optimisticId ? { ...msg, error: true, optimistic: false } : msg
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

  // Handle closing a ticket
  const handleCloseTicket = async () => {
    if (!selectedTicketId || isUpdatingTicket) return;
    setIsUpdatingTicket(true);
    try {
      const closedTicket = await adminChatService.closeTicket(selectedTicketId);
      // Update the ticket status in state
      setTickets((prevTickets) =>
        prevTickets.map((ticket) =>
          ticket.id === selectedTicketId ? { ...ticket, status: closedTicket.status } : ticket
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

  // Handle reopening a ticket
  const handleReopenTicket = async () => {
    if (!selectedTicketId || isUpdatingTicket) return;
    setIsUpdatingTicket(true);
    try {
      const reopenedTicket = await adminChatService.reopenTicket(selectedTicketId);
      // Update the ticket status in state
      setTickets((prevTickets) =>
        prevTickets.map((ticket) =>
          ticket.id === selectedTicketId ? { ...ticket, status: reopenedTicket.status } : ticket
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
        {/* Sidebar */}
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
          {/* Back Button */}
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

          {/* Sidebar Header */}
          <div className="admin-chat-sidebar-header" style={{ flexShrink: 0 }}>
            <h2>All Support Tickets</h2>
          </div>

          {/* Tickets List */}
          <div className="tickets-list" style={{ flexGrow: 1, overflowY: "auto" }}>
            {isLoadingTickets ? (
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
                        {formatDate(ticket.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="admin-chat-main">
          {selectedTicket ? (
            <>
              {/* Chat Header */}
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
                      className="close-ticket-button"
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
                      className="reopen-ticket-button"
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

              {/* Messages */}
              <div className="admin-chat-messages">
                {!selectedTicket.messages || selectedTicket.messages.length === 0 ? (
                  <div className="no-messages">
                    <FiInfo size={48} />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  selectedTicket.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`message ${
                        message.is_admin ? "admin-message" : "user-message"
                      } ${message.optimistic ? "optimistic" : ""} ${
                        message.error ? "error" : ""
                      }`}
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
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area for Admin Message */}
              <div className="admin-chat-input">
                {selectedTicket.status === "closed" ? (
                  <div className="ticket-closed-message">
                    <FiAlertCircle size={20} />
                    <span>This ticket is closed. Reopen it to send messages.</span>
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
              <FiMessageCircle size={48} style={{ marginBottom: "1rem", opacity: 0.7 }} />
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
