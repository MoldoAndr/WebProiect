import React from "react";
import { useNavigate } from "react-router-dom";
import { FiUser, FiLogOut, FiSettings, FiCpu, FiMessageCircle } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { Link } from 'react-router-dom';

const DashboardHeader = ({ user }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="dashboard-header">
      <div className="header-container">
        {/* Left side - Logo with animation */}
        <div className="header-left">
          <div className="logo">
            <FiCpu className="logo-icon" size={32} />
            <span className="logo-text-primary">LLM</span>
            <span className="logo-text-secondary">Studio</span>
          </div>
        </div>

        {/* Right side - User info and settings */}
        <div className="header-right">
          <Link to="/admin-chat" className="admin-chat-button" title="Talk with an Administrator">
            <FiMessageCircle size={20} />
            <span>Admin Support</span>
          </Link>

          <Link to="/settings">
            <button className="settings-button" title="Settings">
              <FiSettings size={20} />
            </button>
          </Link>

          <div className="user-info">
            <div className="avatar">
              <FiUser size={14} />
            </div>
            <span className="username">{user?.username || "User"}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="logout-button"
          >
            <FiLogOut size={16} className="logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;