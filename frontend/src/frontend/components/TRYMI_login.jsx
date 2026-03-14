import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "../config/api";
import "../styles/login.css";

const TrymiLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isShaking, setIsShaking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const eyeIconStyle = {
    position: "absolute",
    right: "15px",
    top: "50%",
    transform: "translateY(-50%)",
    cursor: "pointer",
    fontSize: "1.3rem",
    color: "#1dbc08",
    transition: "all 0.3s ease",
    zIndex: 10,
    background: "none",
    border: "none",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  // Toggle mobile menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Close menu when nav link is clicked
  const closeMenu = () => {
    setMenuOpen(false);
  };

  // Redirect logic removed as per user request

  // Get stored users from localStorage
  const getStoredUsers = () => {
    const users = localStorage.getItem("users");
    return users ? JSON.parse(users) : [];
  };

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Show message function with longer duration
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 5000);
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();

    // Trim input values
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      showMessage("danger", "Please fill in all fields");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    // Validate email format
    if (!validateEmail(trimmedEmail)) {
      showMessage("danger", "Please enter a valid email address");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    setIsShaking(false); // Make sure we have an isLoading state, or at least don't block
    
    try {
      // ✅ FIXED: Call backend login API instead of checking localStorage
      const response = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
        }),
      });

      const data = await response.json();
      
      console.log("Login response:", data);

      if (!response.ok) {
        showMessage("danger", data.message || "Invalid credentials");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        return;
      }

      // Successful login
      const user = data.user;
      
      // ✅ FIXED: Save complete user data including ID
      const userData = {
        _id: user._id || user.id || user.email, 
        id: user._id || user.id || user.email,
        name: user.name,
        email: user.email,
        gender: user.gender,
        loginTime: new Date().toISOString(),
      };

      // ✅ Save in multiple formats for compatibility
      localStorage.setItem("currentUser", JSON.stringify(userData));
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("userId", userData._id); // ⭐ KEY LINE
      localStorage.setItem("isAuthenticated", "true");
      
      // Optionally store the token if the backend returns it
      if (data.token) {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("token", data.token);
      }

      console.log("✅ User-specific cart/wishlist will load from backend");
      console.log("✅ INSTANT LOGIN:", userData._id);

      showMessage("success", "Login successful!");
      setEmail("");
      setPassword("");

      // 🔥 IMMEDIATE REDIRECT - 0.3s total
      setTimeout(() => navigate("/outfit-predictor", { replace: true }), 300);
      
    } catch (error) {
      console.error("Login error:", error);
      showMessage("danger", "Network error. Please try again.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div>
      {/* ✅ MOBILE NAVBAR WITH HAMBURGER MENU */}
      <nav className="login-navbar">
        <div className="heading">
          <h4 className="login-navbar-heading">TRYMI</h4>
        </div>
        <ul className={`login-nav-links ${menuOpen ? "active" : ""}`}>
          <li>
            <Link to="/about" className="login-nav-link" onClick={closeMenu}>
              About
            </Link>
          </li>
        </ul>
        <button
          className="nav-toggle-btn"
          onClick={toggleMenu}
          aria-label="Toggle menu"
          style={{ display: "none" }} /* Will be visible on mobile via CSS */
        >
          ☰
        </button>
      </nav>

      {/* Background Video */}
      <div className="login-video-container">
        <video autoPlay muted loop playsInline className="login-video">
          <source src="/example.2.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Login Container */}
      <div className="login-container">
        <div className={`login-box ${isShaking ? "shake" : ""}`}>
          <h2 className="login-heading">Welcome Back</h2>

          <p className="login-subtitle">Login to continue</p>

          <form onSubmit={handleSubmit}>
            <div className="login-form-group">
              <input
                type="email"
                className="login-form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                autoComplete="email"
              />
            </div>

            <div className="login-form-group" style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                className="login-form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete="current-password"
                style={{ paddingRight: "50px" }}
              />
              <button
                type="button"
                style={eyeIconStyle}
                onClick={() => setShowPassword(!showPassword)}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = "#16a006";
                  e.currentTarget.style.transform =
                    "translateY(-50%) scale(1.15) rotate(10deg)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = "#1dbc08";
                  e.currentTarget.style.transform =
                    "translateY(-50%) scale(1) rotate(0deg)";
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>

            <button type="submit" className="login-btn">
              Log In
            </button>

            {/* Alert Message */}
            {message.text && (
              <div
                className={`login-alert ${message.type === "success"
                  ? "login-alert-success"
                  : "login-alert-danger"
                  }`}
              >
                {message.text}
              </div>
            )}

            <div className="login-footer">
              <p className="login-footer-text">
                Don't have an account?{" "}
                <Link to="/signup" className="login-footer-link">
                  Sign up
                </Link>
              </p>
              <p style={{ marginTop: "10px" }}>
                <Link to="/forgot-password" className="login-forgot-link">
                  Forgot password?
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TrymiLogin;


