// Authorization service for handling login, logout, and user management

// You can replace this with your actual API calls
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Mock user data for development
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
      // For a real implementation, you would call your API:
      // const response = await fetch(`${API_URL}/auth/login`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(credentials),
      // });
      // const data = await response.json();
      
      // Mock implementation for development
      const data = { user: mockUser, token: 'mock-jwt-token' };
      
      // Save token to localStorage
      localStorage.setItem('token', data.token);
      
      return data.user;
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Login failed. Please check your credentials.');
    }
  }

  async logout() {
    // Remove token from localStorage
    localStorage.removeItem('token');
    return true;
  }

  async getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      // For a real implementation:
      // const response = await fetch(`${API_URL}/auth/me`, {
      //   headers: { Authorization: `Bearer ${token}` },
      // });
      // const data = await response.json();
      
      // Mock implementation
      return mockUser;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  getToken() {
    return localStorage.getItem('token');
  }
}

// Create and export a single instance of the service
export const auth = new AuthService();

// Also export the class if needed elsewhere
export default AuthService;
