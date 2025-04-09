// src/components/auth/Register.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "react-toastify";
import {
  FiUser,
  FiMail,
  FiLock,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";
import "./Register.css";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: "user", // default role set to "user"
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  const particleContainerRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Initialize particle effect
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

    // Set up event listeners
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    // Start animation
    createParticles();
    animateParticles();

    // Clean up
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Clear error for this field when user types or selects
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }

    // Calculate password strength if password field changes
    if (name === "password") {
      calculatePasswordStrength(value);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

    // Cap the strength at 5 (for UI purposes)
    const strengthPercentage = Math.min(5, strength);
    setPasswordStrength(strengthPercentage);
  };

  const getStrengthClass = () => {
    if (passwordStrength <= 1) return "password-strength-weak";
    if (passwordStrength <= 3) return "password-strength-medium";
    return "password-strength-strong";
  };

  const getStrengthText = () => {
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength <= 3) return "Medium";
    return "Strong";
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email address is invalid";
    }

    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!termsAccepted) {
      newErrors.terms =
        "You must accept the Terms of Service and Privacy Policy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { username, email, role, password } = formData;
      await register({ username, email, role, password });
      toast.success("Registration successful! You can now login.");
      navigate("/login");
    } catch (error) {
      console.error("Registration error:", error);
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
        setErrors({ ...errors, general: error.response.data.detail });
      } else {
        toast.error("Registration failed. Please try again.");
        setErrors({
          ...errors,
          general: "Registration failed. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      {/* Particle network animation background */}
      <div
        className="particle-network-animation"
        ref={particleContainerRef}
      ></div>

      <div className="register-card">
        <div className="glass-effect"></div>
        <div className="register-header">
          <div className="register-logo">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="#4F5E99"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="#4F5E99"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="#4F5E99"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="register-title">LLM Studio</h1>
          <h2 className="register-subtitle">Create an account</h2>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="error-banner">
              <FiAlertCircle />
              <span>{errors.general}</span>
            </div>
          )}

          {/* New container for the three-column layout */}
          <div className="form-columns">
            {/* Left Column: Username and Email */}
            <div className="form-column form-column-left">
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className={`form-input ${
                    errors.username ? "input-error" : ""
                  }`}
                  placeholder="Choose a username"
                  disabled={isLoading}
                />
                {errors.username && (
                  <p className="error-message">{errors.username}</p>
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
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`form-input ${errors.email ? "input-error" : ""}`}
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="error-message">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Middle Column: Role */}
            <div className="form-column form-column-middle">
              <div className="form-group">
                <label htmlFor="role" className="form-label">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="form-input"
                  disabled={isLoading}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="technician">Technician</option>
                </select>
                {errors.role && <p className="error-message">{errors.role}</p>}
              </div>
            </div>

            {/* Right Column: Password and Confirm Password */}
            <div className="form-column form-column-right">
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input ${
                    errors.password ? "input-error" : ""
                  }`}
                  placeholder="Create a password"
                  disabled={isLoading}
                />
                {formData.password && (
                  <div className="password-strength-container">
                    <div className="password-strength">
                      <div
                        className={`password-strength-bar ${getStrengthClass()}`}
                      ></div>
                    </div>
                    <span className="password-strength-text">
                      {getStrengthText()}
                    </span>
                  </div>
                )}
                {errors.password && (
                  <p className="error-message">{errors.password}</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`form-input ${
                    errors.confirmPassword ? "input-error" : ""
                  }`}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="error-message">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>

          {/* Terms and Submit Button */}
          <div className="form-terms">
            <div className="terms-check">
              <input
                type="checkbox"
                id="terms"
                className="checkbox"
                required
                checked={termsAccepted}
                onChange={() => setTermsAccepted(!termsAccepted)}
                disabled={isLoading}
              />
              <label htmlFor="terms">
                I agree to the{" "}
                <Link to="/terms" className="terms-link">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="terms-link">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.terms && <p className="error-message">{errors.terms}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`register-button ${isLoading ? "loading" : ""}`}
          >
            {isLoading ? (
              <>
                <FiLoader className="spinner" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="login-link">
          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
