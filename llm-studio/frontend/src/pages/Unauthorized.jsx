// src/pages/Unauthorized.jsx
import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLock, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import './Unauthorized.css';

const Unauthorized = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const particleContainerRef = useRef(null);
  
  // Initialize particle animation (similar to login/register)
  useEffect(() => {
    if (!particleContainerRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.className = 'particle-network-canvas';
    particleContainerRef.current.appendChild(canvas);
    
    // Canvas setup and animation code goes here
    // (abbreviated for brevity - similar to Login.jsx animation)
    
    return () => {
      // Cleanup code
    };
  }, []);
  
  const goBack = () => {
    navigate(-1);
  };
  
  const goToDashboard = () => {
    navigate('/dashboard');
  };
  
  return (
    <div className="unauthorized-container">
      <div className="particle-network-animation" ref={particleContainerRef}></div>
      
      <div className="unauthorized-card">
        <div className="glass-effect"></div>
        
        <div className="unauthorized-icon">
          <FiLock size={64} />
        </div>
        
        <h1 className="unauthorized-title">Access Denied</h1>
        
        <p className="unauthorized-message">
          Sorry, you don't have permission to access this page.
          {user ? ` Your current role is "${user.role}".` : ''}
        </p>
        
        <div className="unauthorized-actions">
          <button className="back-button" onClick={goBack}>
            <FiArrowLeft size={18} />
            <span>Go Back</span>
          </button>
          
          <button className="dashboard-button" onClick={goToDashboard}>
            Go to Dashboard
          </button>
        </div>
        
        <p className="unauthorized-help">
          If you believe this is an error, please contact your administrator
          or <Link to="/admin-chat" className="contact-link">contact support</Link>.
        </p>
      </div>
    </div>
  );
};

export default Unauthorized;
