import axios from 'axios';
import { API_URL } from '../config';

// Helper function to normalize a message's data
function normalizeMessage(message) {
  // If _id is missing but id exists, copy id to _id
  if (!message.hasOwnProperty('_id')) {
    message._id = message.id || null;
  }
  return message;
}

// Helper function to normalize an entire ticket
function normalizeTicket(ticket) {
  // Normalize the ticket ID
  const normalized = {
    ...ticket,
    id: ticket._id || ticket.id,
  };

  // If the ticket has messages, normalize each one
  if (Array.isArray(normalized.messages)) {
    normalized.messages = normalized.messages.map(normalizeMessage);
  }
  return normalized;
}

class AdminChatService {
  constructor() {
    // Points to /api/admin-chat
    this.apiUrl = `${API_URL}/admin-chat`;
  }

  // Attach the user's JWT token to all requests
  setAuthHeader() {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }

  // --- User Routes ---

  async getUserTickets() {
    this.setAuthHeader();
    try {
      const response = await axios.get(`${this.apiUrl}/tickets`);
      // Normalize each ticket and its messages
      const tickets = response.data.map((t) => normalizeTicket(t));
      return tickets;
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      throw error;
    }
  }

  async getTicket(ticketId) {
    this.setAuthHeader();
    try {
      const response = await axios.get(`${this.apiUrl}/tickets/${ticketId}`);
      const ticket = response.data;
      return normalizeTicket(ticket);
    } catch (error) {
      console.error(`Error fetching ticket ${ticketId}:`, error);
      throw error;
    }
  }

  async createTicket(title, initialMessage = null) {
    this.setAuthHeader();
    try {
      const response = await axios.post(`${this.apiUrl}/tickets`, {
        title,
        initial_message: initialMessage,
      });
      const newTicket = response.data;
      return normalizeTicket(newTicket);
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  async addUserMessage(ticketId, content) {
    this.setAuthHeader();
    try {
      const response = await axios.post(
        `${this.apiUrl}/tickets/${ticketId}/messages`,
        { content }
      );
      // Normalize the returned message (if needed)
      return normalizeMessage(response.data);
    } catch (error) {
      console.error(`Error adding user message to ticket ${ticketId}:`, error);
      console.error('Error response data:', error.response?.data);
      throw error;
    }
  }

  // --- Admin Routes ---
  async getAllTickets(status = null) {
    this.setAuthHeader();
    try {
      let url = `${this.apiUrl}/admin/tickets`;
      if (status) {
        url += `?status=${status}`;
      }
      const response = await axios.get(url);
      // Normalize each ticket and its messages
      return response.data.map((t) => normalizeTicket(t));
    } catch (error) {
      console.error('Error fetching all tickets (admin):', error);
      throw error;
    }
  }

  async updateTicket(ticketId, updateData) {
    this.setAuthHeader();
    try {
      const response = await axios.put(
        `${this.apiUrl}/admin/tickets/${ticketId}`,
        updateData
      );
      return normalizeTicket(response.data);
    } catch (error) {
      console.error(`Error updating ticket ${ticketId}:`, error);
      throw error;
    }
  }

  async addAdminMessage(ticketId, content) {
    this.setAuthHeader();
    try {
      const response = await axios.post(
        `${this.apiUrl}/admin/tickets/${ticketId}/messages`,
        { content }
      );
      return normalizeMessage(response.data);
    } catch (error) {
      console.error(`Error adding admin message to ticket ${ticketId}:`, error);
      throw error;
    }
  }

  async closeTicket(ticketId) {
    this.setAuthHeader();
    try {
      const response = await axios.post(
        `${this.apiUrl}/admin/tickets/${ticketId}/close`
      );
      return normalizeTicket(response.data);
    } catch (error) {
      console.error(`Error closing ticket ${ticketId}:`, error);
      throw error;
    }
  }

  async reopenTicket(ticketId) {
    this.setAuthHeader();
    try {
      const response = await axios.post(
        `${this.apiUrl}/admin/tickets/${ticketId}/reopen`
      );
      return normalizeTicket(response.data);
    } catch (error) {
      console.error(`Error reopening ticket ${ticketId}:`, error);
      throw error;
    }
  }
}

export const adminChatService = new AdminChatService();
export default AdminChatService;
