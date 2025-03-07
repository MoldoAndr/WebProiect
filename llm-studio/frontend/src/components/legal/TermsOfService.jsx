// src/components/legal/PrivacyPolicy.jsx
import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./Legal.css";

const TermsOfService = () => {
  const particleContainerRef = useRef(null);

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

    // Particle network options
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

    // Particle class
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
            ctx.lineWidth = 10;
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-container">
      <div className="particle-network-animation" ref={particleContainerRef}></div>
      
      <div className="legal-wrapper">
        <div className="legal-header">
          <div className="legal-logo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#4F5E99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#4F5E99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#4F5E99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="legal-title">Terms of service</h1>
          <p className="legal-updated">Last Updated: March 5, 2025</p>
        </div>
        
        <div className="legal-content">
          <section>
            <h2>1. Introduction</h2>
            <p>Welcome to LLM Studio. These Terms of Service ("Terms") govern your access to and use of the LLM Studio platform, including any associated websites, applications, APIs, and services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms.</p>
            <p>LLM Studio is provided by [Your Company Name] ("we," "us," or "our"). These Terms constitute a legally binding agreement between you and [Your Company Name].</p>
          </section>

          <section>
            <h2>2. Acceptance of Terms</h2>
            <p>By creating an account, accessing, or using the Service, you affirm that:</p>
            <ul>
              <li>You have read, understood, and agree to be bound by these Terms</li>
              <li>You are at least 18 years old</li>
              <li>You have the authority to enter into this agreement</li>
              <li>Your use of the Service will comply with all applicable laws and regulations</li>
            </ul>
            <p>If you do not agree with any part of these Terms, you may not access or use our Service.</p>
          </section>

          <section>
            <h2>3. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. We will provide notice of significant changes by:</p>
            <ul>
              <li>Updating the "Last Updated" date at the top of these Terms</li>
              <li>Posting a notice on the Service</li>
              <li>Sending you an email notification</li>
            </ul>
            <p>Your continued use of the Service after such modifications constitutes your acceptance of the revised Terms. If you do not agree to the changes, you must stop using the Service.</p>
          </section>

          <section>
            <h2>4. Account Registration and Security</h2>
            <h3>4.1 Account Creation</h3>
            <p>To use certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during registration and to keep your information up-to-date.</p>
            
            <h3>4.2 Account Security</h3>
            <p>You are responsible for:</p>
            <ul>
              <li>Safeguarding your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use or security breach</li>
            </ul>
            <p>We reserve the right to disable any account if we reasonably believe you have violated these Terms.</p>
          </section>

          <section>
            <h2>5. Service Description and Usage</h2>
            <h3>5.1 Service Features</h3>
            <p>LLM Studio provides a platform for managing, customizing, and interacting with various large language models (LLMs). Features may include model selection, data visualization, conversation history, and administrative tools.</p>
            
            <h3>5.2 Usage Limitations</h3>
            <p>Your use of the Service is subject to certain limitations, including but not limited to:</p>
            <ul>
              <li>API rate limits</li>
              <li>Storage capacity</li>
              <li>Processing constraints</li>
              <li>Usage quotas based on your subscription plan</li>
            </ul>
            
            <h3>5.3 Acceptable Use</h3>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service to violate any law or regulation</li>
              <li>Infringe on intellectual property rights</li>
              <li>Generate or distribute harmful, offensive, or misleading content</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Interfere with other users' access to the Service</li>
              <li>Use the Service for high-risk activities where failure could lead to death, injury, or significant damage</li>
              <li>Reverse engineer, decompile, or disassemble any portion of the Service</li>
            </ul>
          </section>

          <section>
            <h2>6. Subscription Plans and Payment</h2>
            <h3>6.1 Fees and Billing</h3>
            <ul>
              <li>We offer various subscription plans with different features and pricing</li>
              <li>All fees are exclusive of taxes unless otherwise stated</li>
              <li>You agree to pay all applicable fees and taxes</li>
              <li>Subscription fees are billed in advance on a recurring basis</li>
              <li>All payments are non-refundable unless otherwise specified</li>
            </ul>
            
            <h3>6.2 Subscription Changes and Cancellation</h3>
            <ul>
              <li>You may upgrade, downgrade, or cancel your subscription at any time</li>
              <li>Downgrading may result in loss of features or data</li>
              <li>Cancellation will take effect at the end of your current billing period</li>
            </ul>
          </section>

          <section>
            <h2>7. Intellectual Property Rights</h2>
            <h3>7.1 Our Intellectual Property</h3>
            <p>The Service, including its software, design, text, graphics, interfaces, and content, is owned by us and protected by intellectual property laws. These Terms do not grant you ownership rights to the Service.</p>
            
            <h3>7.2 License to Use the Service</h3>
            <p>We grant you a limited, non-exclusive, non-transferable, revocable license to use the Service for its intended purposes, subject to these Terms.</p>
            
            <h3>7.3 Your Content</h3>
            <p>You retain ownership of any content you upload, create, or share through the Service ("User Content"). By uploading User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, store, display, reproduce, and distribute your User Content solely for the purposes of providing and improving the Service.</p>
          </section>

          <section>
            <h2>8. Data Privacy and Security</h2>
            <h3>8.1 Privacy Policy</h3>
            <p>Our <Link to="/privacy-policy" className="legal-link">Privacy Policy</Link> governs how we collect, use, and disclose information. By using the Service, you consent to our collection and use of data as described in the Privacy Policy.</p>
            
            <h3>8.2 Data Security</h3>
            <p>We implement reasonable security measures to protect your data. However, no system is completely secure, and we cannot guarantee that your data will never be accessed, disclosed, altered, or destroyed.</p>
          </section>

          <section>
            <h2>9. Third-Party Services and Content</h2>
            <h3>9.1 Third-Party Services</h3>
            <p>The Service may integrate with or contain links to third-party services. These third-party services are governed by their own terms and privacy policies. We are not responsible for the content or practices of any third-party services.</p>
            
            <h3>9.2 Third-Party Content</h3>
            <p>The Service may allow access to content from third-party sources, including LLMs developed by third parties. We do not control and are not responsible for third-party content.</p>
          </section>

          <section>
            <h2>10. Disclaimers and Limitations of Liability</h2>
            <h3>10.1 Disclaimers</h3>
            <p className="uppercase-text">THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.</p>
            
            <p className="uppercase-text">WE DO NOT WARRANT THAT:</p>
            <ul className="uppercase-list">
              <li>THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE</li>
              <li>DEFECTS WILL BE CORRECTED</li>
              <li>THE SERVICE OR SERVERS ARE FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS</li>
              <li>THE SERVICE WILL MEET YOUR SPECIFIC REQUIREMENTS</li>
              <li>THE ACCURACY, RELIABILITY, OR COMPLETENESS OF LLM OUTPUTS</li>
            </ul>
            
            <h3>10.2 Limitation of Liability</h3>
            <p className="uppercase-text">TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:</p>
            <ul className="uppercase-list">
              <li>YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE</li>
              <li>ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICE</li>
              <li>ANY CONTENT OBTAINED FROM THE SERVICE</li>
              <li>UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT</li>
              <li>OUTPUTS OR DECISIONS MADE USING LLMs</li>
            </ul>
            
            <p className="uppercase-text">OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM OR RELATING TO THESE TERMS OR THE SERVICE IS LIMITED TO THE AMOUNT YOU PAID TO US FOR THE SERVICE DURING THE 12 MONTHS PRECEDING THE CLAIM.</p>
          </section>

          <section>
            <h2>11. Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless [Your Company Name], its officers, directors, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising from:</p>
            <ul>
              <li>Your use of the Service</li>
              <li>Your User Content</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party</li>
              <li>Your violation of any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2>12. Termination</h2>
            <h3>12.1 Termination by You</h3>
            <p>You may terminate your account at any time by following the instructions on the Service or by contacting us.</p>
            
            <h3>12.2 Termination by Us</h3>
            <p>We may suspend or terminate your access to the Service, in whole or in part, at any time for any reason, including but not limited to violation of these Terms, without notice or liability.</p>
            
            <h3>12.3 Effect of Termination</h3>
            <p>Upon termination:</p>
            <ul>
              <li>Your right to access and use the Service will immediately cease</li>
              <li>We may delete your account and all associated data</li>
              <li>Any provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability</li>
            </ul>
          </section>

          <section>
            <h2>13. General Provisions</h2>
            <h3>13.1 Governing Law</h3>
            <p>These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law principles.</p>
            
            <h3>13.2 Dispute Resolution</h3>
            <p>Any dispute arising from or relating to these Terms or the Service shall be resolved by binding arbitration in accordance with the commercial arbitration rules of [Arbitration Association]. The arbitration shall be conducted in [Your City, State/Country].</p>
            
            <h3>13.3 Severability</h3>
            <p>If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.</p>
            
            <h3>13.4 Waiver</h3>
            <p>Our failure to enforce any right or provision of these Terms will not be considered a waiver of such right or provision.</p>
            
            <h3>13.5 Assignment</h3>
            <p>You may not assign these Terms or any rights or obligations hereunder without our prior written consent. We may assign these Terms at any time without notice or consent.</p>
            
            <h3>13.6 Entire Agreement</h3>
            <p>These Terms, together with the Privacy Policy, constitute the entire agreement between you and us regarding the Service and supersede all prior agreements and understandings.</p>
          </section>
          
          <div className="legal-footer">
            <p>By using LLM Studio, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
            <div className="legal-actions">
              <Link to="/login" className="legal-button">Back to Login</Link>
              <Link to="/privacy" className="legal-link">View Privacy Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



export default TermsOfService;