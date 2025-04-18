import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NET from 'vanta/dist/vanta.net.min';
import * as THREE from 'three';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './LandingPage.css';

const LandingPage = () => {
  const vantaRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const vantaEffect = NET({
      el: vantaRef.current,
      THREE: THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: true,
      minHeight: 200.00,
      minWidth: 200.00,
      scale: 1.00,
      scaleMobile: 1.00,
      color: 0x241873,
      points: 14.00,
      maxDistance: 24.00,
      spacing: 18.00
    });

    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, []);

  const handleGetStarted = () => {
    navigate('/register');
  };

  const handleLearnMore = () => {
    navigate('/terms');
  };

  function SampleNextArrow(props) {
    const { className, style, onClick } = props;
    return (
      <div
        className={className}
        style={{ ...style, display: "block", right: "25px", zIndex: 10 }}
        onClick={onClick}
      />
    );
  }

  function SamplePrevArrow(props) {
    const { className, style, onClick } = props;
    return (
      <div
        className={className}
        style={{ ...style, display: "block", left: "25px", zIndex: 10 }}
        onClick={onClick}
      />
    );
  }

  return (
    <div className="landing-page">
      <div ref={vantaRef} className="vanta-background">
        <div className="content">
          <header className="header">
            <nav className="nav">
              <div className="logo">LLM Studio</div>
            </nav>
          </header>

          <div className="top-section">
            <h1 className="title">Welcome to LLM Studio</h1>
            <p className="subtitle">Your AI-Powered Development Environment</p>
            <div className="cta-buttons">
              <button className="primary-button" onClick={handleGetStarted}>Get Started</button>
              <button className="secondary-button" onClick={handleLearnMore}>Learn More</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
