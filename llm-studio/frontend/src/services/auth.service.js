import axios from 'axios';
import { API_URL } from '../config';

const API_BASE_URL = API_URL;
const mockUser = {
  id: 1,
  username: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
};

class AuthService {
  async login(credentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          username: credentials.username,
          password: credentials.password
        })
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      const data = await response.json();
      
      // Save token to localStorage - ensure this is working
      window.localStorage.setItem('token', data.access_token);
      console.log('Token saved to localStorage:', data.access_token);
      
      // Set default authorization header for axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
      
      // Get user data if needed
      const userResponse = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { 
          'Authorization': `Bearer ${data.access_token}`
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user data');
      }
      
      const userData = await userResponse.json();
      
      // For development fallback
      return userData || mockUser;
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Login failed. Please check your credentials.');
    }
  }

  async logout() {
    // Remove token from localStorage
    window.localStorage.removeItem('token');
    
    // Remove authorization header
    delete axios.defaults.headers.common['Authorization'];
    
    return true;
  }

  async getCurrentUser() {
    const token = window.localStorage.getItem('token');
    if (!token) return null;
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // Token might be expired
        window.localStorage.removeItem('token');
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  getToken() {
    return window.localStorage.getItem('token');
  }
  
  isAuthenticated() {
    return !!this.getToken();
  }

  // Additional Functions for Forgot Password and Change Password

  async forgotPasswordCode(email) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password-code`, { email });
      return response.data;
    } catch (error) {
      console.error('Forgot Password Code error:', error);
      throw error;
    }
  }

  async resetPasswordCode(email, code, newPassword) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password-code`, {
        email,
        code,
        new_password: newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Reset Password Code error:', error);
      throw error;
    }
  }

  async changePassword(oldPassword, newPassword) {
    try {
      const token = this.getToken();
      const response = await axios.post(`${API_BASE_URL}/auth/change-password`, 
        { old_password: oldPassword, new_password: newPassword },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error('Change Password error:', error);
      throw error;
    }
  }
}

// Create and export a single instance of the service
export const auth = new AuthService();

// Also export the class if needed elsewhere
export default AuthService;
