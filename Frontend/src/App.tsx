import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import LoginPage from  './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import TechnicianPage from './pages/TechnicianPage';
import UserPage from './pages/UserPage';
import ProtectedRoute from './assets/components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          
          {/* Protected Route for any logged-in user */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Role-specific routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['Administrator']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/technician"
            element={
              <ProtectedRoute roles={['Technician']}>
                <TechnicianPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user"
            element={
              <ProtectedRoute roles={['User']}>
                <UserPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback to login if route doesn't match */}
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
