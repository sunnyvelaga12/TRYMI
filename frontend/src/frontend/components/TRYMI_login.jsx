import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/login.css";

const TrymiLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isShaking, setIsShaking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

    const users = getStoredUsers();
    console.log("Attempting login with:", trimmedEmail);
    console.log("Available users:", users);

    // Case-insensitive email matching
    const user = users.find(
      (u) =>
        u.email.toLowerCase() === trimmedEmail.toLowerCase() &&
        u.password === trimmedPassword,
    );

    if (user) {
      // ✅ FIXED: Save complete user data including ID
      const userData = {
        _id: user.id || user._id || user.email, // Use user ID if available, fallback to email
        id: user.id || user._id || user.email,
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

      // Cart/wishlist now fetched from backend by userId
      console.log("✅ User-specific cart/wishlist will load from backend");

      if (user) {
        // ✅ SAVE USER DATA (instant)
        const userData = {
          _id: user.id || user._id || user.email,
          id: user.id || user._id || user.email,
          name: user.name,
          email: user.email,
          gender: user.gender,
          loginTime: new Date().toISOString(),
        };

        localStorage.setItem("currentUser", JSON.stringify(userData));
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("userId", userData._id);
        localStorage.setItem("isAuthenticated", "true");

        console.log("✅ INSTANT LOGIN:", userData._id);

        showMessage("success", "Login successful!");
        setEmail("");
        setPassword("");

        // 🔥 IMMEDIATE REDIRECT - 0.3s total
        navigate("/outfit-predictor", { replace: true });
      }
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

            <div className="login-form-group">
              <input
                type="password"
                className="login-form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete="current-password"
              />
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
