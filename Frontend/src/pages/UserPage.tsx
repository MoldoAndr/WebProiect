import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { Link } from 'react-router-dom';

const UserPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '1rem' }}>
      <h1>User Page</h1>
      {user && (
        <p>
          Hello <strong>{user.name}</strong>, you are logged in as <strong>{user.role}</strong>.
        </p>
      )}
      <hr />
      <nav>
        <Link to="/dashboard">Go to Dashboard</Link>
      </nav>
      <button onClick={logout} style={{ marginTop: '1rem' }}>
        Logout
      </button>
    </div>
  );
};

export default UserPage;
