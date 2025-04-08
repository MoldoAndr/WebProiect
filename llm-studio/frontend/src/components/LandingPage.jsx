import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NET from 'vanta/dist/vanta.net.min';
import * as THREE from 'three';
import Slider from 'react-slick';
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
      maxDistance: 29.00,
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

  // Increase the arrow z-index so they show above slides
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

  const carouselSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    arrows: true,
    nextArrow: <SampleNextArrow />,
    prevArrow: <SamplePrevArrow />,
  };

  const features = [
    {
      title: "AI-Powered Development",
      description: "Leverage advanced language models for intelligent code completion and suggestions",
      icon: "🤖"
    },
    {
      title: "Real-time Collaboration",
      description: "Work together with your team in real-time with instant feedback",
      icon: "👥"
    },
    {
      title: "Smart Code Analysis",
      description: "Get intelligent insights and recommendations for your code",
      icon: "🔍"
    },
    {
      title: "Customizable Environment",
      description: "Tailor your development environment to your specific needs",
      icon: "⚙️"
    }
  ];

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

          <div className="carousel-container">
            <Slider {...carouselSettings}>
              {features.map((feature, index) => (
                <div key={index} className="carousel-slide">
                  <div className="feature-icon">{feature.icon}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              ))}
            </Slider>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
