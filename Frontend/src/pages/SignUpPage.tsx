import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import Image from "../assets/AI.gif";
import Logo from "../assets/AI2.gif";
import { FaEye, FaEyeSlash } from "react-icons/fa6";
import "./LoginPage.css";

function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("User");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signup(name, email, password, role);
      navigate("/dashboard");
    } catch (error) {
      console.error("Signup failed", error);
      setError(error instanceof Error ? error.message : "Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page-wrapper">
      {/* Ghost + Title Container */}
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
          <img src={Image} alt="Signup illustration" />
        </div>
        <div className="login-right">
          <div className="login-right-container">
            <div className="login-logo">
              <img src={Logo} alt="Company logo" />
            </div>
            <div className="login-center">
              <h2><strong>Create your account!</strong></h2>
              <p>Please enter your details</p>
              {error && <div className="error-message">{error}</div>}
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  disabled={isLoading}
                />
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
                    autoComplete="new-password"
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
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  className="role-select"
                  disabled={isLoading}
                >
                  <option value="User">User</option>
                  <option value="Administrator">Administrator</option>
                  <option value="Technician">Technician</option>
                </select>
                <div className="login-center-buttons">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className={isLoading ? 'loading' : ''}
                  >
                    {isLoading ? 'Creating Account...' : 'Sign Up'}
                  </button>
                </div>
              </form>
            </div>
            <p className="login-bottom-p">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-800">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;