import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { auth } from '../../services/auth.service'; // Adjust the path as needed
import './ForgotPassword.css';

const ForgotPassword = () => {
  // Common state for both steps
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  // step = 1: Request reset code, step = 2: Enter reset code & new passwords
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const particleContainerRef = useRef(null);

  // Particle network effect (your existing code)
  useEffect(() => {
    if (!particleContainerRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'particle-network-canvas';
    particleContainerRef.current.appendChild(canvas);

    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

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
          particle.direction.x = Math.cos(angle) * force * 0.05;
          particle.direction.y = Math.sin(angle) * force * 0.05;
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

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    
    createParticles();
    animateParticles();
    
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validateEmailForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateResetForm = () => {
    const newErrors = {};
    if (!formData.code.trim()) {
      newErrors.code = 'Reset code is required';
    }
    if (!formData.newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    }
    if (formData.newPassword !== formData.confirmNewPassword) {
      newErrors.confirmNewPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmailForm()) return;
    
    setIsLoading(true);
    try {
      await auth.forgotPasswordCode(formData.email);
      toast.success('A reset code has been sent to your email');
      setStep(2);
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error('Password reset request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!validateResetForm()) return;
    
    setIsLoading(true);
    try {
      await auth.resetPasswordCode(formData.email, formData.code, formData.newPassword);
      toast.success('Your password has been reset successfully');
      // Optionally, navigate to login or reset the form state
      navigate('/login');
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Reset password failed. Please check your reset code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="forgot-password-container">
      {/* Particle network animation background */}
      <div className="particle-network-animation" ref={particleContainerRef}></div>
      
      <div className="forgot-password-card">
        <div className="glass-effect"></div>
        <div className="forgot-password-header">
          <div className="forgot-password-logo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#4F5E99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#4F5E99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#4F5E99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="forgot-password-title">Password Recovery</h1>
          <h2 className="forgot-password-subtitle">
            {step === 1 
              ? 'Enter your email to receive a reset code'
              : 'Enter the reset code and set your new password'}
          </h2>
        </div>
        
        {step === 1 ? (
          <form className="forgot-password-form" onSubmit={handleEmailSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                placeholder="Enter your email address"
              />
              {errors.email && <p className="error-message">{errors.email}</p>}
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`forgot-password-button ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </button>
            
            <div className="back-link">
              <Link to="/login" className="back-to-login">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to Login
              </Link>
            </div>
          </form>
        ) : (
          <form className="forgot-password-form" onSubmit={handleResetSubmit}>
            <div className="form-group">
              <label htmlFor="code" className="form-label">Reset Code</label>
              <input
                id="code"
                name="code"
                type="text"
                required
                value={formData.code}
                onChange={handleChange}
                className={`form-input ${errors.code ? 'input-error' : ''}`}
                placeholder="Enter the reset code"
              />
              {errors.code && <p className="error-message">{errors.code}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">New Password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                value={formData.newPassword}
                onChange={handleChange}
                className={`form-input ${errors.newPassword ? 'input-error' : ''}`}
                placeholder="Enter new password"
              />
              {errors.newPassword && <p className="error-message">{errors.newPassword}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="confirmNewPassword" className="form-label">Confirm New Password</label>
              <input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                required
                value={formData.confirmNewPassword}
                onChange={handleChange}
                className={`form-input ${errors.confirmNewPassword ? 'input-error' : ''}`}
                placeholder="Confirm new password"
              />
              {errors.confirmNewPassword && <p className="error-message">{errors.confirmNewPassword}</p>}
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`forgot-password-button ${isLoading ? 'loading' : ''}`}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
            
            <div className="back-link">
              <Link to="/login" className="back-to-login">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
