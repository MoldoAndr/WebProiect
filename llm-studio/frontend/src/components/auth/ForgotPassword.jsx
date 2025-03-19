import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [formData, setFormData] = useState({
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  
  const particleContainerRef = useRef(null);
  
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
    
    // Create particles
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

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Password reset link sent to your email');
      setIsSubmitted(true);
    } catch (error) {
      console.error('Password reset error:', error);
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Password reset request failed. Please try again.');
      }
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
            {isSubmitted 
              ? 'Check your email' 
              : 'Enter your email to reset password'}
          </h2>
        </div>
        
        {isSubmitted ? (
          <div className="success-message">
            <div className="success-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <p>We've sent a recovery link to <strong>{formData.email}</strong></p>
            <p className="reset-instructions">
              Please check your email and follow the instructions to reset your password.
              If you don't see the email, check your spam folder.
            </p>
            <button className="back-to-login-button" onClick={handleBackToLogin}>
              Back to Login
            </button>
          </div>
        ) : (
          <form className="forgot-password-form" onSubmit={handleSubmit}>
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
              {isLoading ? 'Sending...' : 'Send Reset Link'}
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