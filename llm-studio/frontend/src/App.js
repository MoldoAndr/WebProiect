import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Authentication components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import { AuthProvider } from './hooks/useAuth';
import PrivateRoute from './components/auth/PrivateRoute';
import RoleBasedRoute from './components/auth/RoleBasedRoute';

// Pages
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import AdminChat from './pages/AdminChat';
import Unauthorized from './pages/Unauthorized';

// Legal pages
import TermsOfService from './components/legal/TermsOfService';
import PrivacyPolicy from './components/legal/PrivacyPolicy';

function App() {
  return (
    <AuthProvider>
      <ToastContainer 
        position="top-right" 
        autoClose={5000} 
        hideProgressBar={false} 
        newestOnTop={false} 
        closeOnClick 
        rtl={false} 
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
        theme="dark"
      />
      
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        
        {/* Protected routes - any authenticated user */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin-chat"
          element={
            <PrivateRoute>
              <AdminChat />
            </PrivateRoute>
          }
        />
        
        {/* Role-based protected routes */}
        <Route
          path="/admin-dashboard"
          element={
            <RoleBasedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </RoleBasedRoute>
          }
        />
        
        {/* Default route - redirect to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
