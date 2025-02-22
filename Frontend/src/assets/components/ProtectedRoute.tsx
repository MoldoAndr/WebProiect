import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

interface ProtectedRouteProps {
  children: JSX.Element;
  roles?: string[];  // e.g. ['Administrator', 'Technician', 'User']
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { user } = useAuth();

  // 1. Check if user is logged in
  if (!user) {
    return <Navigate to="/login" />;
  }

  // 2. If roles are specified, check if user’s role is included
  if (roles && !roles.includes(user.role)) {
    // If user role is not in the allowed roles, redirect or show a "Not Authorized" page
    return <Navigate to="/login" />;
  }

  // 3. If checks pass, render child component
  return children;
};

export default ProtectedRoute;
