// src/pages/Settings.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiUser, FiLock, FiMail, FiTrash2, FiSave, FiArrowLeft, 
  FiMoon, FiSun, FiToggleLeft, FiToggleRight, FiDownload, FiShield } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import './Settings.css';
import { FiActivity } from "react-icons/fi";

const Settings = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const particleContainerRef = useRef(null);
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    name: user?.name || '',
    bio: user?.bio || '',
  });
  
  // Security settings
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // Appearance settings
  const [appearanceData, setAppearanceData] = useState({
    darkMode: true,
    animationsEnabled: true,
    compactMode: false,
    fontSize: 'medium',
  });
  
  // Data management settings
  const [expandedSection, setExpandedSection] = useState(null);
  
  // Validation errors
  const [profileErrors, setProfileErrors] = useState({});
  const [securityErrors, setSecurityErrors] = useState({});

  // Initialize particle network animation
  useEffect(() => {
    // Make sure the container exists
    if (!particleContainerRef.current) return;
    
    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.className = 'particle-network-canvas';
    particleContainerRef.current.appendChild(canvas);
    
    // Set canvas dimensions
    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize particle animation
    const ctx = canvas.getContext('2d');
    let animationFrame;
    let particles = [];
    let mouseX = 0;
    let mouseY = 0;
    let isMouseActive = false;
    
    // Particle network options
    const options = {
      particleColor: 'rgba(255, 255, 255, 0.7)',
      lineColor: 'rgba(70, 130, 180, 0.4)',
      particleAmount: 70,
      defaultSpeed: 0.5,
      variantSpeed: 1,
      defaultRadius: 2,
      variantRadius: 2,
      linkRadius: 200
    };
    
    // Particle class
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.speed = options.defaultSpeed + Math.random() * options.variantSpeed;
        this.directionAngle = Math.floor(Math.random() * 360);
        this.direction = {
          x: Math.cos(this.directionAngle) * this.speed,
          y: Math.sin(this.directionAngle) * this.speed
        };
        this.radius = options.defaultRadius + Math.random() * options.variantRadius;
      }
      
      update() {
        this.border();
        this.x += this.direction.x;
        this.y += this.direction.y;
      }
      
      border() {
        if (this.x < 0 || this.x > canvas.width) {
          this.direction.x *= -1;
        }
        if (this.y < 0 || this.y > canvas.height) {
          this.direction.y *= -1;
        }
        if (this.x < 0) this.x = 0;
        if (this.x > canvas.width) this.x = canvas.width;
        if (this.y < 0) this.y = 0;
        if (this.y > canvas.height) this.y = canvas.height;
      }
      
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = options.particleColor;
        ctx.fill();
      }
    }
    
    // Create particles
    const createParticles = () => {
      particles = [];
      for (let i = 0; i < options.particleAmount; i++) {
        particles.push(new Particle());
      }
    };
    
    // Draw links between particles
    const drawLinks = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < options.linkRadius) {
            const opacity = 1 - distance / options.linkRadius;
            ctx.strokeStyle = `rgba(70, 130, 180, ${opacity * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };
    
    // Handle mouse interaction
    const onMouseMove = (e) => {
      isMouseActive = true;
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      // Create attraction to mouse
      for (const particle of particles) {
        const dx = mouseX - particle.x;
        const dy = mouseY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const force = options.linkRadius / distance;
        
        if (distance < options.linkRadius) {
          const angle = Math.atan2(dy, dx);
          particle.direction.x = Math.cos(angle) * force * 0.05;
          particle.direction.y = Math.sin(angle) * force * 0.05;
        }
      }
    };
    
    const onMouseLeave = () => {
      isMouseActive = false;
      // Reset particles to normal movement
      for (const particle of particles) {
        const angle = Math.floor(Math.random() * 360);
        particle.direction.x = Math.cos(angle) * particle.speed;
        particle.direction.y = Math.sin(angle) * particle.speed;
      }
    };
    
    // Animation loop
    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      for (const particle of particles) {
        particle.update();
        particle.draw();
      }
      
      // Draw links
      drawLinks();
      
      // Draw mouse connection if active
      if (isMouseActive) {
        for (const particle of particles) {
          const dx = mouseX - particle.x;
          const dy = mouseY - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < options.linkRadius) {
            ctx.strokeStyle = `rgba(70, 130, 180, ${(1 - distance / options.linkRadius) * 0.8})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(mouseX, mouseY);
            ctx.stroke();
          }
        }
      }
      
      animationFrame = requestAnimationFrame(animateParticles);
    };
    
    // Set up event listeners
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    
    // Start animation
    createParticles();
    animateParticles();
    
    // Clean up
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      if (particleContainerRef.current && canvas) {
        particleContainerRef.current.removeChild(canvas);
      }
    };
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
    
    // Clear errors when user types
    if (profileErrors[name]) {
      setProfileErrors({ ...profileErrors, [name]: null });
    }
  };

  const handleSecurityChange = (e) => {
    const { name, value } = e.target;
    setSecurityData({ ...securityData, [name]: value });
    
    // Clear errors when user types
    if (securityErrors[name]) {
      setSecurityErrors({ ...securityErrors, [name]: null });
    }
  };

  const handleAppearanceChange = (name, value) => {
    setAppearanceData({ ...appearanceData, [name]: value });
  };

  const validateProfileForm = () => {
    const errors = {};
    
    if (!profileData.username.trim()) {
      errors.username = 'Username is required';
    } else if (profileData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!profileData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      errors.email = 'Email address is invalid';
    }
    
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSecurityForm = () => {
    const errors = {};
    
    if (!securityData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!securityData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (securityData.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (!securityData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (securityData.newPassword !== securityData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setSecurityErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateProfileForm()) {
      return;
    }
    
    setIsLoading(true);
    try {
      // In a real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate success
      toast.success('Profile updated successfully');
      // In a real app, would update the user context
      // updateUser(profileData);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    
    if (!validateSecurityForm()) {
      return;
    }
    
    setIsLoading(true);
    try {
      // In a real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate success
      toast.success('Password updated successfully');
      
      // Reset form
      setSecurityData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppearanceSubmit = async (e) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      // In a real app, this would save to user preferences
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate success
      toast.success('Appearance settings saved');
    } catch (error) {
      console.error('Error saving appearance settings:', error);
      toast.error('Failed to save appearance settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataAction = async (action) => {
    setIsLoading(true);
    try {
      // In a real app, these would call the API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      switch (action) {
        case 'deleteHistory':
          toast.success('Conversation history deleted');
          break;
        case 'clearAllData':
          toast.success('All user data cleared');
          break;
        case 'exportData':
          toast.success('Data exported successfully');
          break;
        case 'deleteAccount':
          toast.success('Account deleted successfully');
          // In a real app, would log the user out and redirect
          setTimeout(() => {
            logout();
            navigate('/login');
          }, 1500);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Error performing action ${action}:`, error);
      toast.error(`Failed to ${action.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const toggleSection = (section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  return (
    <div className="settings-container">
      {/* Particle network animation background */}
      <div className="particle-network-animation" ref={particleContainerRef}></div>
      
      <div className="settings-card">
        <div className="glass-effect"></div>
        
        <div className="settings-header">
          <button className="back-button" onClick={handleBackToDashboard}>
            <FiArrowLeft size={20} />
          </button>
          <h1 className="settings-title">Settings</h1>
        </div>
        
        <div className="settings-tabs">
          <button 
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FiUser size={18} />
            <span>Profile</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <FiLock size={18} />
            <span>Security</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <FiMoon size={18} />
            <span>Appearance</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            <FiTrash2 size={18} />
            <span>Data</span>
          </button>
        </div>
        
        <div className="settings-content">
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <form className="settings-form" onSubmit={handleProfileSubmit}>
              <h2 className="settings-section-title">Profile Information</h2>
              <p className="settings-section-description">
                Update your account information and public profile.
              </p>
              
              <div className="form-group">
                <label htmlFor="username" className="form-label">Username</label>
                <div className="input-with-icon">
                  <FiUser className="input-icon" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={profileData.username}
                    onChange={handleProfileChange}
                    className={`form-input ${profileErrors.username ? 'input-error' : ''}`}
                    placeholder="Enter your username"
                  />
                </div>
                {profileErrors.username && <p className="error-message">{profileErrors.username}</p>}
              </div>
              
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email</label>
                <div className="input-with-icon">
                  <FiMail className="input-icon" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    className={`form-input ${profileErrors.email ? 'input-error' : ''}`}
                    placeholder="Enter your email"
                  />
                </div>
                {profileErrors.email && <p className="error-message">{profileErrors.email}</p>}
              </div>
              
              <div className="form-group">
                <label htmlFor="name" className="form-label">Full Name (Optional)</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  className="form-input"
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="bio" className="form-label">Bio (Optional)</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={profileData.bio}
                  onChange={handleProfileChange}
                  className="form-input"
                  placeholder="Brief description about yourself"
                  rows="3"
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className={`in-settings-button ${isLoading ? 'loading' : ''}`}
              >
                <FiSave size={18} />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}
          
          {/* Security Settings */}
          {activeTab === 'security' && (
            <form className="settings-form" onSubmit={handleSecuritySubmit}>
              <h2 className="settings-section-title">Password & Security</h2>
              <p className="settings-section-description">
                Manage your password and security settings.
              </p>
              
              <div className="form-group">
                <label htmlFor="currentPassword" className="form-label">Current Password</label>
                <div className="input-with-icon">
                  <FiLock className="input-icon" />
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={securityData.currentPassword}
                    onChange={handleSecurityChange}
                    className={`form-input ${securityErrors.currentPassword ? 'input-error' : ''}`}
                    placeholder="Enter your current password"
                  />
                </div>
                {securityErrors.currentPassword && <p className="error-message">{securityErrors.currentPassword}</p>}
              </div>
              
              <div className="form-group">
                <label htmlFor="newPassword" className="form-label">New Password</label>
                <div className="input-with-icon">
                  <FiLock className="input-icon" />
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={securityData.newPassword}
                    onChange={handleSecurityChange}
                    className={`form-input ${securityErrors.newPassword ? 'input-error' : ''}`}
                    placeholder="Enter new password"
                  />
                </div>
                {securityErrors.newPassword && <p className="error-message">{securityErrors.newPassword}</p>}
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
                <div className="input-with-icon">
                  <FiLock className="input-icon" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={securityData.confirmPassword}
                    onChange={handleSecurityChange}
                    className={`form-input ${securityErrors.confirmPassword ? 'input-error' : ''}`}
                    placeholder="Confirm new password"
                  />
                </div>
                {securityErrors.confirmPassword && <p className="error-message">{securityErrors.confirmPassword}</p>}
              </div>
              
              <div className="security-options">
                <h3 className="subsection-title">Two-Factor Authentication</h3>
                <div className="option-item">
                  <div className="option-info">
                    <FiShield size={20} className="option-icon" />
                    <div>
                      <h4>Enable 2FA</h4>
                      <p>Add an extra layer of security to your account</p>
                    </div>
                  </div>
                  <button type="button" className="toggle-button">
                    <FiToggleLeft size={24} />
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className={`in-settings-button ${isLoading ? 'loading' : ''}`}
              >
                <FiSave size={18} />
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
          
          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <form className="settings-form" onSubmit={handleAppearanceSubmit}>
              <h2 className="settings-section-title">Appearance</h2>
              <p className="settings-section-description">
                Customize the look and feel of the application.
              </p>
              
              <div className="appearance-options">
                <div className="option-item">
                  <div className="option-info">
                    <FiMoon size={20} className="option-icon" />
                    <div>
                      <h4>Dark Mode</h4>
                      <p>Use dark theme for the application</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="toggle-button"
                    onClick={() => handleAppearanceChange('darkMode', !appearanceData.darkMode)}
                  >
                    {appearanceData.darkMode ? (
                      <FiToggleRight size={24} className="active" />
                    ) : (
                      <FiToggleLeft size={24} />
                    )}
                  </button>
                </div>
                
                <div className="option-item">
                  <div className="option-info">
                    <FiActivity size={20} className="option-icon" />
                    <div>
                      <h4>Animations</h4>
                      <p>Enable animations and transitions</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="toggle-button"
                    onClick={() => handleAppearanceChange('animationsEnabled', !appearanceData.animationsEnabled)}
                  >
                    {appearanceData.animationsEnabled ? (
                      <FiToggleRight size={24} className="active" />
                    ) : (
                      <FiToggleLeft size={24} />
                    )}
                  </button>
                </div>
                
                <div className="option-item">
                  <div className="option-info">
                    <div className="option-icon">
                      <span className="text-size-icon">A</span>
                    </div>
                    <div>
                      <h4>Font Size</h4>
                      <p>Adjust the text size throughout the app</p>
                    </div>
                  </div>
                  <div className="font-size-options">
                    <button 
                      type="button"
                      className={`font-size-button ${appearanceData.fontSize === 'small' ? 'active' : ''}`}
                      onClick={() => handleAppearanceChange('fontSize', 'small')}
                    >
                      S
                    </button>
                    <button 
                      type="button"
                      className={`font-size-button ${appearanceData.fontSize === 'medium' ? 'active' : ''}`}
                      onClick={() => handleAppearanceChange('fontSize', 'medium')}
                    >
                      M
                    </button>
                    <button 
                      type="button"
                      className={`font-size-button ${appearanceData.fontSize === 'large' ? 'active' : ''}`}
                      onClick={() => handleAppearanceChange('fontSize', 'large')}
                    >
                      L
                    </button>
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className={`in-settings-button ${isLoading ? 'loading' : ''}`}
              >
                <FiSave size={18} />
                {isLoading ? 'Saving...' : 'Save Appearance Settings'}
              </button>
            </form>
          )}
          
          {/* Data Management */}
          {activeTab === 'data' && (
            <div className="settings-form">
              <h2 className="settings-section-title">Data Management</h2>
              <p className="settings-section-description">
                Manage your data, including conversation history and account information.
              </p>
              
              <div className="data-section">
                <div 
                  className={`collapsible-section ${expandedSection === 'history' ? 'expanded' : ''}`}
                  onClick={() => toggleSection('history')}
                >
                  <div className="section-header">
                    <h3>Conversation History</h3>
                    <span className="expand-icon">{expandedSection === 'history' ? '−' : '+'}</span>
                  </div>
                  
                  {expandedSection === 'history' && (
                    <div className="section-content">
                      <p>Delete all your conversation history with LLMs. This action cannot be undone.</p>
                      <div className="action-buttons">
                        <button 
                          type="button" 
                          className="danger-button"
                          onClick={() => handleDataAction('deleteHistory')}
                          disabled={isLoading}
                        >
                          <FiTrash2 size={16} />
                          {isLoading ? 'Deleting...' : 'Delete All History'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div 
                  className={`collapsible-section ${expandedSection === 'export' ? 'expanded' : ''}`}
                  onClick={() => toggleSection('export')}
                >
                  <div className="section-header">
                    <h3>Export Data</h3>
                    <span className="expand-icon">{expandedSection === 'export' ? '−' : '+'}</span>
                  </div>
                  
                  {expandedSection === 'export' && (
                    <div className="section-content">
                      <p>Download all your data including profile, settings, and conversation history.</p>
                      <div className="action-buttons">
                        <button 
                          type="button" 
                          className="primary-button"
                          onClick={() => handleDataAction('exportData')}
                          disabled={isLoading}
                        >
                          <FiDownload size={16} />
                          {isLoading ? 'Exporting...' : 'Export All Data'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div 
                  className={`collapsible-section ${expandedSection === 'account' ? 'expanded' : ''}`}
                  onClick={() => toggleSection('account')}
                >
                  <div className="section-header">
                    <h3>Delete Account</h3>
                    <span className="expand-icon">{expandedSection === 'account' ? '−' : '+'}</span>
                  </div>
                  
                  {expandedSection === 'account' && (
                    <div className="section-content">
                      <p className="warning-text">
                        This will permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <div className="action-buttons">
                        <button 
                          type="button" 
                          className="danger-button delete-account"
                          onClick={() => handleDataAction('deleteAccount')}
                          disabled={isLoading}
                        >
                          <FiTrash2 size={16} />
                          {isLoading ? 'Deleting...' : 'Delete Account Permanently'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;