import { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

// Create auth context
const AuthContext = createContext(null);

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Load user from JWT token on initial render
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Set default authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Fetch user data
          const response = await axios.get(`${API_URL}/users/me`);
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Failed to load user:", error);
          // Token might be expired, clear it
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      
      setLoading(false);
    };
    
    loadUser();
  }, []);
  
  // Login function
  const login = async (credentials) => {
    setError(null);
    
    try {
      // Convert credentials to form data format
      const formData = new URLSearchParams();
      formData.append('username', credentials.username);
      formData.append('password', credentials.password);
      
      const response = await axios.post(`${API_URL}/auth/login`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const { access_token } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('token', access_token);
      
      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Fetch user information
      const userResponse = await axios.get(`${API_URL}/users/me`);
      setUser(userResponse.data);
      setIsAuthenticated(true);
      
      return userResponse.data;
    } catch (error) {
      let errorMessage = 'Login failed';
      
      if (error.response) {
        errorMessage = error.response.data?.detail || errorMessage;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  // Register function
  const register = async (userData) => {
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      return response.data;
    } catch (error) {
      let errorMessage = 'Registration failed';
      
      if (error.response) {
        errorMessage = error.response.data?.detail || errorMessage;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
  };
  
  // Update user information
  const updateUserInfo = async (userData) => {
    setError(null);
    
    try {
      const response = await axios.put(`${API_URL}/users/me`, userData);
      setUser(response.data);
      return response.data;
    } catch (error) {
      let errorMessage = 'Failed to update user information';
      
      if (error.response) {
        errorMessage = error.response.data?.detail || errorMessage;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  // Context value
  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    updateUserInfo
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
