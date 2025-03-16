// src/pages/AdminChat.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSend,
  FiArrowLeft,
  FiInfo,
  FiAlertCircle,
  FitMessageCircle,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { adminChatService } from "../services/admin-chat.service";
import { toast } from "react-toastify";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import "./AdminChat.css";

// Fallback mock data in case API fails
const mockAdminChats = [
  {
    id: "ticket-1",
    title: "Billing inquiry",
    status: "open",
    created_at: "2025-03-10T14:30:00Z",
    messages: [
      {
        id: 1,
        role: "user",
        content: "I have a question about my recent subscription charge.",
        created_at: "2025-03-10T14:30:00Z",
      },
      {
        id: 2,
        role: "admin",
        content:
          "Hello! I'd be happy to help with your billing inquiry. Could you please provide your account email and the date of the charge you're inquiring about?",
        created_at: "2025-03-10T14:35:00Z",
        admin_name: "Support Admin",
      },
    ],
  },
  {
    id: "ticket-2",
    title: "Feature request",
    status: "open",
    created_at: "2025-03-08T09:15:00Z",
    messages: [
      {
        id: 3,
        role: "user",
        content:
          "I would like to suggest adding a dark mode to the application.",
        created_at: "2025-03-08T09:15:00Z",
      },
      {
        id: 4,
        role: "admin",
        content:
          "Thank you for your suggestion! We're actually working on implementing dark mode in our next release. Would you like to join our beta testing program to try it out early?",
        created_at: "2025-03-08T10:22:00Z",
        admin_name: "Product Manager",
      },
    ],
  },
  {
    id: "ticket-3",
    title: "Technical issue",
    status: "closed",
    created_at: "2025-03-05T16:45:00Z",
    messages: [
      {
        id: 5,
        role: "user",
        content:
          "I'm experiencing slow response times when using the GPT-4 model.",
        created_at: "2025-03-05T16:45:00Z",
      },
      {
        id: 6,
        role: "admin",
        content:
          "I'll look into this for you. Can you tell me what time of day you're experiencing the slowdowns?",
        created_at: "2025-03-05T17:10:00Z",
        admin_name: "Technical Support",
      },
      {
        id: 7,
        role: "user",
        content: "Usually in the afternoons, around 2-4 PM EST.",
        created_at: "2025-03-05T17:15:00Z",
      },
      {
        id: 8,
        role: "admin",
        content:
          "Thanks for the information. We've identified a performance issue during peak hours and have applied a fix. Please let us know if you continue to experience any slowdowns.",
        created_at: "2025-03-05T18:30:00Z",
        admin_name: "Technical Support",
      },
      {
        id: 9,
        role: "user",
        content: "The performance is much better now. Thank you!",
        created_at: "2025-03-06T14:25:00Z",
      },
      {
        id: 10,
        role: "admin",
        content:
          "Excellent! I'm glad to hear that. I'll be closing this ticket, but please don't hesitate to reach out if you have any other questions or concerns.",
        created_at: "2025-03-06T14:40:00Z",
        admin_name: "Technical Support",
      },
    ],
  },
];

const AdminChat = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Fetch user tickets on component mount
  useEffect(() => {}, []);

  // Get the selected ticket
  const selectedTicket = tickets.find(
    (ticket) => ticket.id === selectedTicketId
  );

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTicket]);

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Handle sending a new message
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    if (!selectedTicketId) return;

    setIsLoading(true);

    // Create a new message
    const userMessage = {
      id: Date.now(),
      role: "user",
      content: newMessage,
      created_at: new Date().toISOString(),
    };

    // Update the ticket with the new message
    setTickets((prevTickets) =>
      prevTickets.map((ticket) => {
        if (ticket.id === selectedTicketId) {
          return {
            ...ticket,
            messages: [...ticket.messages, userMessage],
          };
        }
        return ticket;
      })
    );

    // Clear the input
    setNewMessage("");

    // Simulate admin response after 1.5 seconds
    setTimeout(() => {
      const adminMessage = {
        id: Date.now() + 1,
        role: "admin",
        content: `Thank you for your message. An administrator will review it and respond as soon as possible.`,
        created_at: new Date().toISOString(),
        admin_name: "Auto-Response",
      };

      setTickets((prevTickets) =>
        prevTickets.map((ticket) => {
          if (ticket.id === selectedTicketId) {
            return {
              ...ticket,
              messages: [...ticket.messages, adminMessage],
            };
          }
          return ticket;
        })
      );

      setIsLoading(false);
    }, 1500);
  };

  // Handle creating a new ticket
  const handleCreateTicket = () => {
    if (!newTicketSubject.trim()) return;

    const newTicket = {
      id: `ticket-${Date.now()}`,
      title: newTicketSubject,
      status: "open",
      created_at: new Date().toISOString(),
      messages: [],
    };

    setTickets([newTicket, ...tickets]);
    setSelectedTicketId(newTicket.id);
    setNewTicketSubject("");
    setShowNewTicketForm(false);
  };

  return (
    <div className="dashboard-container">
      <DashboardHeader user={user} />
      <div className="admin-chat-container">
        /* Sidebar with tickets */
        <div
          className="admin-chat-sidebar"
          style={{
            height: "70%",
            marginTop: "15px",
            marginLeft: "15px",
            borderRadius: "8px",
          }}
        >
          <div className="admin-chat-sidebar-header">
            <h2>Support Tickets</h2>
            <button
              className="new-ticket-button"
              onClick={() => setShowNewTicketForm(true)}
            >
              New Ticket
            </button>
          </div>

          {showNewTicketForm ? (
            <div className="new-ticket-form">
              <input
                type="text"
                placeholder="Enter ticket subject..."
                value={newTicketSubject}
                onChange={(e) => setNewTicketSubject(e.target.value)}
                className="new-ticket-input"
              />
              <div className="new-ticket-actions">
                <button
                  className="cancel-button"
                  onClick={() => setShowNewTicketForm(false)}
                >
                  Cancel
                </button>
                <button
                  className="create-button"
                  onClick={handleCreateTicket}
                  disabled={!newTicketSubject.trim()}
                >
                  Create
                </button>
              </div>
            </div>
          ) : null}

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
                  <div className="ticket-title">{ticket.title}</div>
                  <div className="ticket-meta">
                    <span className={`ticket-status ${ticket.status}`}>
                      {ticket.status}
                    </span>
                    <span className="ticket-date">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-chat-main">
          {selectedTicket ? (
            <>
              <div className="admin-chat-header">
                <button
                  className="back-button"
                  onClick={() => setSelectedTicketId(null)}
                >
                  <FiArrowLeft />
                </button>
                <div className="admin-chat-info">
                  <h2>{selectedTicket.title}</h2>
                  <div className="admin-chat-meta">
                    <span className={`ticket-status ${selectedTicket.status}`}>
                      {selectedTicket.status}
                    </span>
                    <span className="ticket-date">
                      Created: {formatDate(selectedTicket.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="admin-chat-messages">
                {selectedTicket.messages.length === 0 ? (
                  <div className="no-messages">
                    <FiInfo size={48} />
                    <p>
                      No messages yet. Start the conversation by sending a
                      message.
                    </p>
                  </div>
                ) : (
                  selectedTicket.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`message ${
                        message.role === "user"
                          ? "user-message"
                          : "admin-message"
                      }`}
                    >
                      <div className="message-content">{message.content}</div>
                      <div className="message-meta">
                        {message.role === "admin" && message.admin_name && (
                          <span className="admin-name">
                            {message.admin_name}
                          </span>
                        )}
                        <span className="message-time">
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="admin-chat-input">
                {selectedTicket.status === "closed" ? (
                  <div className="ticket-closed-message">
                    <FiAlertCircle size={20} />
                    <span>
                      This ticket is closed. Please create a new ticket if you
                      need further assistance.
                    </span>
                  </div>
                ) : (
                  <>
                    <textarea
                      placeholder="Type your message here..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={isLoading}
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
                      disabled={!newMessage.trim() || isLoading}
                    >
                      <FiSend size={20} />
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h2>Talk with an Administrator</h2>
              <p>
                Select an existing ticket from the sidebar to continue a
                conversation, or create a new ticket to get help from our
                support team.
              </p>
              <button
                className="new-ticket-button large"
                onClick={() => setShowNewTicketForm(true)}
              >
                Create New Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChat;
