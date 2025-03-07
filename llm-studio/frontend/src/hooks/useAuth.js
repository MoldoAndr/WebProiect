// // src/hooks/useAuth.js
// import { useState, useEffect, createContext, useContext } from 'react';
// import axios from 'axios';
// import { API_URL } from '../config';

// // Create auth context
// const AuthContext = createContext(null);

// // Auth provider component
// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
  
//   // Load user from local storage on initial render
//   useEffect(() => {
//     const loadUser = async () => {
//       const token = localStorage.getItem('token');
//       if (token) {
//         try {
//           axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
//           const response = await axios.get(`${API_URL}/users/me`);
//           setUser(response.data);
//         } catch (error) {
//           console.error("Failed to load user:", error);
//           localStorage.removeItem('token');
//           delete axios.defaults.headers.common['Authorization'];
//         }
//       }
//       setLoading(false);
//     };
    
//     loadUser();
//   }, []);
  
//   const login = async (credentials) => {
//     try {
//       const response = await axios.post(`${API_URL}/auth/login`, credentials);
//       const { token, user } = response.data;
      
//       localStorage.setItem('token', token);
//       axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
//       setUser(user);
//       setError(null);
//       return user;
//     } catch (error) {
//       setError(error.response?.data?.message || 'Login failed');
//       throw error;
//     }
//   };
  
//   // Register function
//   const register = async (userData) => {
//     try {
//       const response = await axios.post(`${API_URL}/auth/register`, userData);
      
//       setError(null);
//       return response.data;
//     } catch (error) {
//       setError(error.response?.data?.message || 'Registration failed');
//       throw error;
//     }
//   };
  
//   // Logout function
//   const logout = () => {
//     localStorage.removeItem('token');
//     delete axios.defaults.headers.common['Authorization'];
//     setUser(null);
//   };
  
//   // Context value
//   const value = {
//     user,
//     loading,
//     error,
//     login,
//     register,
//     logout,
//     isAuthenticated: !!user,
//   };
  
//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// };

// // Custom hook to use auth context
// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

// export default useAuth;

// src/hooks/useAuth.js (Mock Version for Frontend Testing)
import { useState, useEffect, createContext, useContext } from 'react';

// Create auth context
const AuthContext = createContext(null);

// Mock storage key
const STORAGE_KEY = 'llm_studio_users';
const TOKEN_KEY = 'llm_studio_token';
const CURRENT_USER_KEY = 'llm_studio_current_user';

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load user from local storage on initial render
  useEffect(() => {
    const loadUser = () => {
      try {
        const currentUsername = localStorage.getItem(CURRENT_USER_KEY);
        if (currentUsername) {
          const usersJson = localStorage.getItem(STORAGE_KEY);
          const users = usersJson ? JSON.parse(usersJson) : [];
          const currentUser = users.find(u => u.username === currentUsername);
          
          if (currentUser) {
            setUser(currentUser);
          }
        }
      } catch (error) {
        console.error("Failed to load user:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);
  
  // Register function - stores user in localStorage
  const register = async (userData) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { username, email, password } = userData;
      
      // Get existing users
      const usersJson = localStorage.getItem(STORAGE_KEY);
      const users = usersJson ? JSON.parse(usersJson) : [];
      
      // Check if username or email already exists
      const existingUser = users.find(
        user => user.username === username || user.email === email
      );
      
      if (existingUser) {
        const errorMessage = existingUser.username === username 
          ? 'Username already taken'
          : 'Email already registered';
        
        throw new Error(errorMessage);
      }
      
      // Create new user
      const newUser = {
        id: Date.now().toString(),
        username,
        email,
        password, // In a real app, this would be hashed
        createdAt: new Date().toISOString()
      };
      
      // Save to local storage
      users.push(newUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      
      return { success: true, message: 'Registration successful' };
    } catch (error) {
      setError(error.message || 'Registration failed');
      throw error;
    }
  };
  
  // Login function - validates credentials from localStorage
  const login = async (credentials) => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { username, password } = credentials;
      
      // For testing, allow any credentials
      const mockUser = {
        id: 'test-user-id',
        username: username || 'testuser',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      // Store the current user
      localStorage.setItem(CURRENT_USER_KEY, mockUser.username);
      localStorage.setItem(TOKEN_KEY, 'mock-jwt-token');
      
      setUser(mockUser);
      setError(null);
      return mockUser;
    } catch (error) {
      setError(error.message || 'Login failed');
      throw error;
    }
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };
  
  // Context value
  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
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