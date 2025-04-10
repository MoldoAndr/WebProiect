import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSend,
  FiArrowLeft,
  FiInfo,
  FiAlertCircle,
  FiMessageCircle,
  FiLoader,
  FiPlus,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { adminChatService } from "../services/admin-chat.service";
import { toast } from "react-toastify";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import "./AdminChat.css";

const AdminChat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  const firstLoadRef = useRef(true);

  const fetchTickets = useCallback(async () => {
    try {
      if (firstLoadRef.current) {
        setIsLoadingTickets(true);
      }

      const response = await adminChatService.getUserTickets();

      if (Array.isArray(response)) {
        const normalizedTickets = response.map((t) => ({
          ...t,
          id: t._id || t.id,
        }));

        setTickets((prevTickets) => {
          let hasChanges = false;

          const updatedTickets = normalizedTickets.map((newTicket) => {
            const existingTicket = prevTickets.find(
              (t) => t.id === newTicket.id
            );
            if (existingTicket) {
              const existingMessages = existingTicket.messages || [];
              const newMessages = newTicket.messages || [];

              const hasNewMessages =
                newMessages.length >
                  existingMessages.filter((m) => !m.optimistic).length ||
                newMessages.some(
                  (newMsg) =>
                    !existingMessages.some(
                      (oldMsg) => oldMsg.id === newMsg.id && !oldMsg.optimistic
                    )
                );

              const hasStatusChange = existingTicket.status !== newTicket.status;

              if (hasNewMessages || hasStatusChange) {
                hasChanges = true;
                const mergedMessages = [
                  ...existingMessages.filter((msg) => msg.optimistic),
                  ...newMessages.filter(
                    (newMsg) =>
                      !existingMessages.some(
                        (oldMsg) =>
                          oldMsg.id === newMsg.id && !oldMsg.optimistic
                      )
                  ),
                ];
                return { ...newTicket, messages: mergedMessages };
              }
              return existingTicket;
            } else {
              hasChanges = true;
              return newTicket;
            }
          });

          if (!hasChanges && prevTickets.length === normalizedTickets.length) {
            return prevTickets;
          }

          const newTicketIds = new Set(normalizedTickets.map((t) => t.id));
          const additionalTickets = prevTickets.filter(
            (t) => !newTicketIds.has(t.id)
          );

          return [...updatedTickets, ...additionalTickets];
        });
      } else {
        console.warn("API response for tickets was not an array:", response);
        setError("Received invalid data format for tickets.");
        toast.error("Failed to load tickets: Invalid data format.");
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setError("Failed to load support tickets. Please try again later.");
      toast.error("Failed to load support tickets.");
    } finally {
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        setIsLoadingTickets(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchTickets();

    const intervalId = setInterval(() => {
      fetchTickets();
    }, 3000);

    return () => clearInterval(intervalId);
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
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicketId || isSending) return;

    setIsSending(true);
    const optimisticId = `optimistic-${Date.now()}`;
    const contentToSend = newMessage;

    const optimisticMessage = {
      id: optimisticId,
      user_id: user?.id || "unknown-user",
      role: "user",
      is_admin: false,
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
      const savedMessage = await adminChatService.addUserMessage(
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
      console.error("Error sending message:", error);
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

  const handleCreateTicket = async () => {
    if (!newTicketSubject.trim() || isCreating) return;

    setIsCreating(true);
    setError(null);
    const subjectToSend = newTicketSubject;

    try {
      const newTicketResponse = await adminChatService.createTicket(
        subjectToSend,
        null
      );

      const newTicket = {
        ...newTicketResponse,
        id: newTicketResponse._id || newTicketResponse.id,
      };

      setTickets((prevTickets) => [newTicket, ...prevTickets]);
      setSelectedTicketId(newTicket.id);
      setNewTicketSubject("");
      setShowNewTicketForm(false);
      toast.success("New support ticket created successfully!");
    } catch (error) {
      console.error("Error creating ticket:", error);
      setError("Failed to create ticket. Please try again.");
      toast.error("Failed to create ticket. Please try again.");
    } finally {
      setIsCreating(false);
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
            <h2>Tickets</h2>
            <button
              className="new-ticket-button"
              onClick={() => setShowNewTicketForm(!showNewTicketForm)}
              disabled={isCreating}
            >
              <FiPlus size={18} />
              <span>New Ticket</span>
            </button>
          </div>
          {showNewTicketForm && (
            <div className="new-ticket-form" style={{ flexShrink: 0 }}>
              <input
                type="text"
                placeholder="Enter ticket subject..."
                value={newTicketSubject}
                onChange={(e) => setNewTicketSubject(e.target.value)}
                className="new-ticket-input"
                disabled={isCreating}
              />
              <div className="new-ticket-actions">
                <button
                  className="cancel-button"
                  onClick={() => setShowNewTicketForm(false)}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  className="create-button"
                  onClick={handleCreateTicket}
                  disabled={!newTicketSubject.trim() || isCreating}
                >
                  {isCreating ? (
                    <FiLoader className="spinner" size={16} />
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </div>
          )}
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
                <span>No tickets found. Create one to start.</span>
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
                    {selectedTicket.updated_at !==
                      selectedTicket.created_at && (
                      <span className="ticket-date">
                        Updated: {formatDate(selectedTicket.updated_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="admin-chat-messages">
                {!selectedTicket.messages ||
                selectedTicket.messages.length === 0 ? (
                  <div className="no-messages">
                    <FiInfo size={48} />
                    <p>Setting up...</p>
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
                      This ticket is closed. Create a new one for further
                      assistance.
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
                          handleSendMessage();
                        }
                      }}
                    />
                    <button
                      className="send-button"
                      onClick={handleSendMessage}
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
              <h2>Talk with an Administrator</h2>
              <p>Select a ticket or create a new one.</p>
              <button
                className="new-ticket-button large"
                onClick={() => setShowNewTicketForm(true)}
                disabled={isCreating}
              >
                <FiPlus size={18} /> Create New Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChat;