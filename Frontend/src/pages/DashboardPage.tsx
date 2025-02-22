import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.name} (Role: {user?.role})</p>
      <nav>
        {user?.role === 'Administrator' && <Link to="/admin">Go to Admin Page</Link>}
        {user?.role === 'Technician' && <Link to="/technician">Go to Technician Page</Link>}
        {user?.role === 'User' && <Link to="/user">Go to User Page</Link>}
      </nav>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

export default DashboardPage;
