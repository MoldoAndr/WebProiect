import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import Image from "../assets/AI.gif";
import Logo from "../assets/AI2.gif";
import { FaEye, FaEyeSlash } from "react-icons/fa6";
import "./LoginPage.css";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (error) {
      console.error("Login failed", error);
      setError(error instanceof Error ? error.message : "Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page-wrapper">
      {}
      <div className="ghost-container">
        <div className="title">
          <h1>LLM Manager</h1>
        </div>
        <div className="ghost">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>

      {}
      <div className="login-main">
        <div className="login-left">
          <img src={Image} alt="Login illustration" />
        </div>
        <div className="login-right">
          <div className="login-right-container">
            <div className="login-logo">
              <img src={Logo} alt="Company logo" />
            </div>
            <div className="login-center">
              <h2><strong>Welcome back!</strong></h2>
              <p>Please enter your details</p>
              {error && <div className="error-message">{error}</div>}
              <form onSubmit={handleSubmit}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  disabled={isLoading}
                />
                <div className="pass-input-div">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  {showPassword ? (
                    <FaEyeSlash 
                      onClick={() => setShowPassword(!showPassword)}
                      className="cursor-pointer"
                    />
                  ) : (
                    <FaEye 
                      onClick={() => setShowPassword(!showPassword)}
                      className="cursor-pointer"
                    />
                  )}
                </div>
                <div className="login-center-buttons">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className={isLoading ? 'loading' : ''}
                  >
                    {isLoading ? 'Logging in...' : 'Log In'}
                  </button>
                </div>
              </form>
            </div>
            <p className="login-bottom-p">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-600 hover:text-blue-800">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;