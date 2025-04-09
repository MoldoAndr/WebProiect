import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import {
  FiUser,
  FiLock,
  FiMail,
  FiTrash2,
  FiSave,
  FiArrowLeft,
  FiMoon,
  FiSun,
  FiToggleLeft,
  FiToggleRight,
  FiDownload,
  FiShield,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import "./Settings.css";
import { FiActivity } from "react-icons/fi";
import { API_URL } from "../config";

const API_BASE_URL = API_URL;

const Settings = () => {
  const { user, logout, updateUserInfo } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(false);
  const particleContainerRef = useRef(null);

  const [profileData, setProfileData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    name: user?.name || "",
    bio: user?.bio || "",
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [appearanceData, setAppearanceData] = useState({
    darkMode: user?.preferences?.darkMode ?? true,
    animationsEnabled: user?.preferences?.animationsEnabled ?? true,
    compactMode: user?.preferences?.compactMode ?? false,
    fontSize: user?.preferences?.fontSize ?? "medium",
  });

  const [expandedSection, setExpandedSection] = useState(null);
  const [profileErrors, setProfileErrors] = useState({});
  const [securityErrors, setSecurityErrors] = useState({});

  useEffect(() => {
    if (!particleContainerRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.className = "particle-network-canvas";
    particleContainerRef.current.appendChild(canvas);

    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const ctx = canvas.getContext("2d");
    let animationFrame;
    let particles = [];
    let mouseX = 0;
    let mouseY = 0;
    let isMouseActive = false;

    const options = {
      particleColor: "rgba(255, 255, 255, 0.7)",
      lineColor: "rgba(70, 130, 180, 0.4)",
      particleAmount: 70,
      defaultSpeed: 0.5,
      variantSpeed: 1,
      defaultRadius: 2,
      variantRadius: 2,
      linkRadius: 200,
    };

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.speed =
          options.defaultSpeed + Math.random() * options.variantSpeed;
        this.directionAngle = Math.floor(Math.random() * 360);
        this.direction = {
          x: Math.cos(this.directionAngle) * this.speed,
          y: Math.sin(this.directionAngle) * this.speed,
        };
        this.radius =
          options.defaultRadius + Math.random() * options.variantRadius;
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

    const createParticles = () => {
      particles = [];
      for (let i = 0; i < options.particleAmount; i++) {
        particles.push(new Particle());
      }
    };

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

    const onMouseMove = (e) => {
      isMouseActive = true;
      mouseX = e.clientX;
      mouseY = e.clientY;

      for (const particle of particles) {
        const dx = mouseX - particle.x;
        const dy = mouseY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const force = options.linkRadius / distance;

        if (distance < options.linkRadius) {
          const angle = Math.atan2(dy, dx);
        }
      }
    };

    const onMouseLeave = () => {
      isMouseActive = false;
      for (const particle of particles) {
        const angle = Math.floor(Math.random() * 360);
        particle.direction.x = Math.cos(angle) * particle.speed;
        particle.direction.y = Math.sin(angle) * particle.speed;
      }
    };

    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const particle of particles) {
        particle.update();
        particle.draw();
      }

      drawLinks();

      if (isMouseActive) {
        for (const particle of particles) {
          const dx = mouseX - particle.x;
          const dy = mouseY - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < options.linkRadius) {
            ctx.strokeStyle = `rgba(70, 130, 180, ${
              (1 - distance / options.linkRadius) * 0.8
            })`;
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

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    createParticles();
    animateParticles();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      if (particleContainerRef.current && canvas) {
        particleContainerRef.current.removeChild(canvas);
      }
    };
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
    if (profileErrors[name])
      setProfileErrors({ ...profileErrors, [name]: null });
  };

  const handleSecurityChange = (e) => {
    const { name, value } = e.target;
    setSecurityData({ ...securityData, [name]: value });
    if (securityErrors[name])
      setSecurityErrors({ ...securityErrors, [name]: null });
  };

  const handleAppearanceChange = (name, value) => {
    setAppearanceData({ ...appearanceData, [name]: value });
  };

  const validateProfileForm = () => {
    const errors = {};
    if (!profileData.username.trim()) errors.username = "Username is required";
    else if (profileData.username.length < 3)
      errors.username = "Username must be at least 3 characters";
    if (!profileData.email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(profileData.email))
      errors.email = "Email address is invalid";
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSecurityForm = () => {
    const errors = {};
    if (!securityData.currentPassword)
      errors.currentPassword = "Current password is required";
    if (!securityData.newPassword)
      errors.newPassword = "New password is required";
    else if (securityData.newPassword.length < 6)
      errors.newPassword = "Password must be at least 6 characters";
    if (!securityData.confirmPassword)
      errors.confirmPassword = "Please confirm your new password";
    else if (securityData.newPassword !== securityData.confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    setSecurityErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!validateProfileForm()) return;

    setIsLoading(true);
    try {
      // Use the updateUserInfo function from useAuth hook instead
      const userData = {
        username: profileData.username,
        email: profileData.email,
        full_name: profileData.name,
        bio: profileData.bio,
      };

      const updatedUser = await updateUserInfo(userData);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    if (!validateSecurityForm()) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        {
          old_password: securityData.currentPassword,
          new_password: securityData.newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Password updated successfully");
      setSecurityData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error(error.response?.data?.detail || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppearanceSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userData = { preferences: appearanceData };
      const updatedUser = await updateUserInfo(userData);
      toast.success("Appearance settings saved");
    } catch (error) {
      console.error("Error saving appearance settings:", error);
      toast.error(error.message || "Failed to save appearance settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataAction = async (action) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const authHeader = { Authorization: `Bearer ${token}` };

      switch (action) {
        case "deleteHistory":
          await axios.delete(`${API_BASE_URL}/users/me/history`, {
            headers: authHeader,
          });
          toast.success("Conversation history deleted");
          break;
        case "exportData":
          const response = await axios.get(`${API_BASE_URL}/users/me/export`, {
            headers: authHeader,
            responseType: "blob",
          });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute("download", `user_data_${user.id}.json`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success("Data exported successfully");
          break;
        case "deleteAccount":
          await axios.delete(`${API_BASE_URL}/users/me`, {
            headers: authHeader,
          });
          toast.success("Account deleted successfully");
          setTimeout(() => {
            logout();
            navigate("/login");
          }, 1500);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Error performing action ${action}:`, error);
      toast.error(
        error.response?.data?.detail ||
          `Failed to ${action.replace(/([A-Z])/g, " $1").toLowerCase()}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToDashboard = () => navigate("/dashboard");
  const toggleSection = (section) =>
    setExpandedSection(expandedSection === section ? null : section);

  return (
    <div className="settings-container">
      <div
        className="particle-network-animation"
        ref={particleContainerRef}
      ></div>
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
            className={`tab-button ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <FiUser size={18} />
            <span>Profile</span>
          </button>
          <button
            className={`tab-button ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            <FiLock size={18} />
            <span>Security</span>
          </button>
        </div>
        <div className="settings-content">
          {activeTab === "profile" && (
            <form className="settings-form" onSubmit={handleProfileSubmit}>
              <h2 className="settings-section-title">Profile Information</h2>
              <p className="settings-section-description">
                Update your account information and public profile.
              </p>
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={profileData.username}
                  onChange={handleProfileChange}
                  className={`form-input ${
                    profileErrors.username ? "input-error" : ""
                  }`}
                  placeholder="Enter your username"
                />
                {profileErrors.username && (
                  <p className="error-message">{profileErrors.username}</p>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  className={`form-input ${
                    profileErrors.email ? "input-error" : ""
                  }`}
                  placeholder="Enter your email"
                />
                {profileErrors.email && (
                  <p className="error-message">{profileErrors.email}</p>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Full Name (Optional)
                </label>
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
                <label htmlFor="bio" className="form-label">
                  Bio (Optional)
                </label>
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
                className={`in-settings-button ${isLoading ? "loading" : ""}`}
              >
                <FiSave size={18} />
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </form>
          )}
          {activeTab === "security" && (
            <form className="settings-form" onSubmit={handleSecuritySubmit}>
              <h2 className="settings-section-title">Password & Security</h2>
              <p className="settings-section-description">
                Manage your password and security settings.
              </p>
              <div className="form-group">
                <label htmlFor="currentPassword" className="form-label">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={securityData.currentPassword}
                  onChange={handleSecurityChange}
                  className={`form-input ${
                    securityErrors.currentPassword ? "input-error" : ""
                  }`}
                  placeholder="Enter your current password"
                />
                {securityErrors.currentPassword && (
                  <p className="error-message">
                    {securityErrors.currentPassword}
                  </p>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="newPassword" className="form-label">
                  New Password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={securityData.newPassword}
                  onChange={handleSecurityChange}
                  className={`form-input ${
                    securityErrors.newPassword ? "input-error" : ""
                  }`}
                  placeholder="Enter new password"
                />
                {securityErrors.newPassword && (
                  <p className="error-message">{securityErrors.newPassword}</p>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={securityData.confirmPassword}
                  onChange={handleSecurityChange}
                  className={`form-input ${
                    securityErrors.confirmPassword ? "input-error" : ""
                  }`}
                  placeholder="Confirm new password"
                />
                {securityErrors.confirmPassword && (
                  <p className="error-message">
                    {securityErrors.confirmPassword}
                  </p>
                )}
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
                className={`in-settings-button ${isLoading ? "loading" : ""}`}
              >
                <FiSave size={18} />
                {isLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
