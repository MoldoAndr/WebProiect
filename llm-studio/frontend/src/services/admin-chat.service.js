import axios from 'axios';
import { API_URL } from '../config';

class AdminChatService {
  constructor() {
    this.apiUrl = `${API_URL}/admin-chat`;
  }

  // Set auth token for API calls
  setAuthHeader() {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }

  // User methods
  async getUserTickets() {
    this.setAuthHeader();
    try {
      const response = await axios.get(`${this.apiUrl}/tickets`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      throw error;
    }
  }

  async getTicket(ticketId) {
    this.setAuthHeader();
    try {
      const response = await axios.get(`${this.apiUrl}/tickets/${ticketId}`);
      return response.data;
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
        initial_message: initialMessage
      });
      return response.data;
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  async addUserMessage(ticketId, content) {
    this.setAuthHeader();
    try {
      const response = await axios.post(`${this.apiUrl}/tickets/${ticketId}/messages`, { 
        content 
      });
      return response.data;
    } catch (error) {
      console.error(`Error adding message to ticket ${ticketId}:`, error);
      throw error;
    }
  }

  // Admin methods
  async getAllTickets(status = null) {
    this.setAuthHeader();
    try {
      let url = `${this.apiUrl}/admin/tickets`;
      if (status) {
        url += `?status=${status}`;
      }
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching all tickets:', error);
      throw error;
    }
  }

  async updateTicket(ticketId, data) {
    this.setAuthHeader();
    try {
      const response = await axios.put(`${this.apiUrl}/admin/tickets/${ticketId}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating ticket ${ticketId}:`, error);
      throw error;
    }
  }

  async addAdminMessage(ticketId, content) {
    this.setAuthHeader();
    try {
      const response = await axios.post(`${this.apiUrl}/admin/tickets/${ticketId}/messages`, { 
        content 
      });
      return response.data;
    } catch (error) {
      console.error(`Error adding admin message to ticket ${ticketId}:`, error);
      throw error;
    }
  }

  async closeTicket(ticketId) {
    this.setAuthHeader();
    try {
      const response = await axios.post(`${this.apiUrl}/admin/tickets/${ticketId}/close`);
      return response.data;
    } catch (error) {
      console.error(`Error closing ticket ${ticketId}:`, error);
      throw error;
    }
  }

  async reopenTicket(ticketId) {
    this.setAuthHeader();
    try {
      const response = await axios.post(`${this.apiUrl}/admin/tickets/${ticketId}/reopen`);
      return response.data;
    } catch (error) {
      console.error(`Error reopening ticket ${ticketId}:`, error);
      throw error;
    }
  }
}

export const adminChatService = new AdminChatService();
export default AdminChatService;