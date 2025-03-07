// src/components/legal/PrivacyPolicy.jsx
import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./Legal.css";

const PrivacyPolicy = () => {
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
      {/* Add the particle animation container */}
      <div className="particle-network-animation" ref={particleContainerRef}></div>
      
      <div className="legal-wrapper">
        {/* Your existing Privacy Policy content */}
        <div className="legal-header">
          <div className="legal-logo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#4F5E99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#4F5E99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#4F5E99" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-updated">Last Updated: March 5, 2025</p>
        </div>
        
        <div className="legal-content">
          <section>
            <h2>1. Introduction</h2>
            <p>
              At LLM Studio, we respect your privacy and are committed to
              protecting your personal data. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you
              use our LLM Studio platform, including any associated websites,
              applications, APIs, and services (collectively, the "Service").
            </p>
            <p>
              Please read this Privacy Policy carefully. By accessing or using
              the Service, you acknowledge that you have read, understood, and
              agree to be bound by the terms of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <p>
              We collect several types of information from and about users of
              our Service:
            </p>

            <h3>2.1 Personal Data</h3>
            <p>
              Personal data refers to information that identifies or can be used
              to identify you as an individual. We may collect the following
              personal data:
            </p>
            <ul>
              <li>
                <strong>Account Information</strong>: When you register for an
                account, we collect your name, email address, username, and
                password.
              </li>
              <li>
                <strong>Profile Information</strong>: Information you provide in
                your user profile, such as job title, organization, and profile
                picture.
              </li>
              <li>
                <strong>Payment Information</strong>: When you subscribe to our
                paid services, we collect payment details, billing address, and
                transaction history. Full payment card details are processed by
                our payment processors and not stored by us.
              </li>
              <li>
                <strong>Usage Data</strong>: Information about how you interact
                with our Service, including access times, pages viewed, links
                clicked, and other actions taken within the Service.
              </li>
              <li>
                <strong>Communications</strong>: If you contact us directly, we
                may receive additional information about you, such as your name,
                email address, phone number, the contents of a message or
                attachments you send us, and other information you choose to
                provide.
              </li>
            </ul>

            <h3>2.2 User Content</h3>
            <p>
              We collect and store the content you create, upload, or receive
              from others when using our Service. This includes:
            </p>
            <ul>
              <li>Prompts and inputs you provide to LLMs</li>
              <li>Outputs generated by LLMs based on your inputs</li>
              <li>Conversation histories</li>
              <li>Custom data uploaded for analysis or fine-tuning</li>
              <li>Settings and preferences for LLM interactions</li>
            </ul>

            <h3>2.3 Technical Data</h3>
            <p>
              We automatically collect certain information when you visit, use,
              or navigate the Service:
            </p>
            <ul>
              <li>
                <strong>Device Information</strong>: IP address, browser type
                and version, operating system, device type, and screen
                resolution.
              </li>
              <li>
                <strong>Log Data</strong>: Server logs, error reports, and
                performance data.
              </li>
              <li>
                <strong>Cookies and Similar Technologies</strong>: We use
                cookies and similar tracking technologies to track activity on
                our Service and hold certain information. See our Cookie Policy
                section for more details.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Information</h2>

            <h3>3.1 Providing and Improving the Service</h3>
            <ul>
              <li>Set up and maintain your account</li>
              <li>Deliver the features and functionality you request</li>
              <li>Process transactions and send related information</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Provide customer support and technical assistance</li>
              <li>Monitor and analyze usage patterns and trends</li>
              <li>Develop, test, and improve our Service</li>
            </ul>

            <h3>3.2 Personalization</h3>
            <ul>
              <li>Personalize your experience</li>
              <li>
                Deliver content and product offerings relevant to your interests
              </li>
              <li>
                Recommend features, products, or services that may be of
                interest to you
              </li>
              <li>Remember your preferences and settings</li>
            </ul>

            <h3>3.3 Communication</h3>
            <ul>
              <li>
                Send administrative information, such as updates, security
                alerts, and support messages
              </li>
              <li>
                Provide information about new features, services, and promotions
                (if you have opted in to receive such communications)
              </li>
              <li>Respond to your inquiries and fulfill your requests</li>
            </ul>

            <h3>3.4 Security and Legal Compliance</h3>
            <ul>
              <li>
                Detect, prevent, and address technical issues, fraud, and
                illegal activities
              </li>
              <li>Enforce our Terms of Service and other legal rights</li>
              <li>
                Comply with applicable legal requirements, industry standards,
                and our policies
              </li>
            </ul>
          </section>

          <section>
            <h2>4. How We Share Your Information</h2>
            <p>We may share your information in the following circumstances:</p>

            <h3>4.1 Service Providers</h3>
            <p>
              We may share your information with third-party vendors, service
              providers, and contractors who perform services on our behalf and
              require access to your information to provide these services.
              These may include payment processing, data analysis, email
              delivery, hosting services, customer service, and marketing
              support.
            </p>

            <h3>4.2 Business Transfers</h3>
            <p>
              If we are involved in a merger, acquisition, or sale of all or a
              portion of our assets, your information may be transferred as part
              of that transaction. We will notify you via email and/or a
              prominent notice on our Service of any change in ownership or uses
              of your information.
            </p>

            <h3>4.3 Legal Requirements</h3>
            <p>
              We may disclose your information if required to do so by law or in
              response to valid requests by public authorities (e.g., a court or
              government agency), or if we believe disclosure is necessary to
              protect our rights, protect your safety or the safety of others,
              investigate fraud, or respond to a government request.
            </p>

            <h3>4.4 With Your Consent</h3>
            <p>
              We may share your information with third parties when you have
              given us your consent to do so.
            </p>

            <h3>4.5 Aggregated or De-identified Data</h3>
            <p>
              We may share aggregated or de-identified information, which cannot
              reasonably be used to identify you, with third parties for
              research, analytics, and improvement of our Service.
            </p>
          </section>

          <section>
            <h2>5. Data Storage and Security</h2>

            <h3>5.1 Data Storage</h3>
            <p>
              We store your information on secure servers located in [relevant
              regions/countries]. Your data may be transferred to, and
              maintained on, computers located outside of your state, province,
              country, or other governmental jurisdiction where the data
              protection laws may differ from those in your jurisdiction.
            </p>

            <h3>5.2 Data Security</h3>
            <p>
              We implement appropriate technical and organizational measures to
              protect the security, confidentiality, and integrity of your
              personal data against unauthorized or unlawful access, alteration,
              disclosure, or destruction. These measures include:
            </p>
            <ul>
              <li>Encryption of sensitive data</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication requirements</li>
              <li>Secure network architecture</li>
              <li>Monitoring for suspicious activities</li>
            </ul>
            <p>
              However, no method of transmission over the Internet or method of
              electronic storage is 100% secure. While we strive to use
              commercially acceptable means to protect your personal data, we
              cannot guarantee its absolute security.
            </p>

            <h3>5.3 Data Retention</h3>
            <p>
              We retain your personal data only for as long as necessary to
              fulfill the purposes for which we collected it, including for the
              purposes of satisfying any legal, accounting, or reporting
              requirements. To determine the appropriate retention period, we
              consider the amount, nature, and sensitivity of the personal data,
              the potential risk of harm from unauthorized use or disclosure,
              and applicable legal requirements.
            </p>
          </section>

          <section>
            <h2>6. Your Data Protection Rights</h2>
            <p>
              Depending on your location, you may have certain rights regarding
              your personal data, which may include:
            </p>
            <ul>
              <li>
                <strong>Right to Access</strong>: You may request information
                about the personal data we hold about you and how it is being
                processed.
              </li>
              <li>
                <strong>Right to Rectification</strong>: You may request the
                correction of inaccurate or incomplete personal data.
              </li>
              <li>
                <strong>Right to Erasure</strong>: You may request the deletion
                of your personal data in certain circumstances.
              </li>
              <li>
                <strong>Right to Restrict Processing</strong>: You may request
                that we restrict the processing of your personal data in certain
                circumstances.
              </li>
              <li>
                <strong>Right to Data Portability</strong>: You may request a
                copy of your personal data in a structured, machine-readable
                format for your own purposes or to transfer to another service.
              </li>
              <li>
                <strong>Right to Object</strong>: You may object to the
                processing of your personal data in certain circumstances.
              </li>
              <li>
                <strong>Right to Withdraw Consent</strong>: You may withdraw
                your consent at any time where we are relying on consent to
                process your personal data.
              </li>
            </ul>
            <p>
              To exercise these rights, please contact us using the information
              provided in the "Contact Us" section. We may require specific
              information from you to help us confirm your identity and ensure
              your right to access your personal data. This is a security
              measure to ensure that personal data is not disclosed to any
              person who has no right to receive it.
            </p>
          </section>

          <section>
            <h2>7. Cookies and Tracking Technologies</h2>

            <h3>7.1 What Are Cookies</h3>
            <p>
              Cookies are small data files that are placed on your device when
              you visit a website. They are widely used to make websites work
              more efficiently and provide information to the website owners.
            </p>

            <h3>7.2 How We Use Cookies</h3>
            <p>
              We use cookies and similar tracking technologies to track activity
              on our Service and store certain information. These technologies
              help us:
            </p>
            <ul>
              <li>Keep you logged in to the Service</li>
              <li>Understand how you use the Service</li>
              <li>Remember your preferences</li>
              <li>Customize your experience</li>
              <li>Analyze and improve the Service</li>
            </ul>

            <h3>7.3 Types of Cookies We Use</h3>
            <ul>
              <li>
                <strong>Essential Cookies</strong>: Necessary for the operation
                of the Service. These enable core functionality such as
                security, network management, and account access.
              </li>
              <li>
                <strong>Analytical/Performance Cookies</strong>: Allow us to
                recognize and count the number of visitors and see how visitors
                move around our Service. This helps us improve how our Service
                works.
              </li>
              <li>
                <strong>Functionality Cookies</strong>: Used to recognize you
                when you return to our Service. This enables us to personalize
                our content for you and remember your preferences.
              </li>
              <li>
                <strong>Targeting Cookies</strong>: Record your visit to our
                Service, the pages you have visited, and the links you have
                followed. We use this information to make our Service and the
                advertising displayed on it more relevant to your interests.
              </li>
            </ul>

            <h3>7.4 Your Choices Regarding Cookies</h3>
            <p>
              You can set your browser to refuse all or some browser cookies or
              to alert you when websites set or access cookies. If you disable
              or refuse cookies, please note that some parts of the Service may
              become inaccessible or not function properly.
            </p>
          </section>

          <section>
            <h2>8. Children's Privacy</h2>
            <p>
              Our Service is not directed to children under the age of 18, and
              we do not knowingly collect personal data from children under 18.
              If we learn that we have collected the personal data of a child
              under 18, we will take steps to delete the information as soon as
              possible. If you believe that we might have any information from
              or about a child under 18, please contact us.
            </p>
          </section>

          <section>
            <h2>9. International Data Transfers</h2>
            <p>
              Your information may be transferred to, and maintained on,
              computers located outside of your state, province, country, or
              other governmental jurisdiction where the data protection laws may
              differ from those in your jurisdiction.
            </p>
            <p>
              If you are located outside [Your Country] and choose to provide
              information to us, please note that we transfer the data,
              including personal data, to [Your Country] and process it there.
              Your consent to this Privacy Policy followed by your submission of
              such information represents your agreement to that transfer.
            </p>
            <p>
              We will take all steps reasonably necessary to ensure that your
              data is treated securely and in accordance with this Privacy
              Policy, and no transfer of your personal data will take place to
              an organization or a country unless there are adequate controls in
              place.
            </p>
          </section>

          <section>
            <h2>10. Third-Party Links and Services</h2>
            <p>
              Our Service may contain links to other websites, applications, or
              services that are not operated by us. If you click on a
              third-party link, you will be directed to that third party's site.
              We strongly advise you to review the Privacy Policy of every site
              you visit.
            </p>
            <p>
              We have no control over and assume no responsibility for the
              content, privacy policies, or practices of any third-party sites
              or services.
            </p>
          </section>

          <section>
            <h2>11. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify
              you of any changes by posting the new Privacy Policy on this page
              and updating the "Last Updated" date at the top of this Privacy
              Policy.
            </p>
            <p>
              You are advised to review this Privacy Policy periodically for any
              changes. Changes to this Privacy Policy are effective when they
              are posted on this page.
            </p>
          </section>

          <section>
            <h2>12. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data
              practices, please contact us:
            </p>
            <p>
              If you have unresolved concerns, you may have the right to make a
              complaint to your local data protection authority.
            </p>
          </section>

          <div className="legal-footer">
            <p>
              By using LLM Studio, you acknowledge that you have read and
              understood this Privacy Policy and agree to its terms.
            </p>
            <div className="legal-actions">
              <Link to="/login" className="legal-button">
                Back to Login
              </Link>
              <Link to="/terms" className="legal-link">
                View Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
