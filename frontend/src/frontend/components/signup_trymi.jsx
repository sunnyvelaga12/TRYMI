import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_ENDPOINTS } from "../../config/api";
import "../styles/signup.css";

const SignUp = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isShaking, setIsShaking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Toggle mobile menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Close menu when nav link is clicked
  const closeMenu = () => {
    setMenuOpen(false);
  };

  // Redirect logic removed as per user request
  // (User wants to see Signup/Login page even if logged in to allow account switching)

  // Calculate password strength
  useEffect(() => {
    if (password.length === 0) {
      setPasswordStrength(0);
    } else if (password.length < 6) {
      setPasswordStrength(1);
    } else if (password.length < 10) {
      setPasswordStrength(2);
    } else {
      setPasswordStrength(3);
    }
  }, [password]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 5000);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (
      !trimmedName ||
      !trimmedEmail ||
      !trimmedPassword ||
      !trimmedConfirmPassword
    ) {
      showMessage("danger", "Please fill in all fields");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    // Validate gender selection
    if (!gender) {
      showMessage("danger", "Please select your gender");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      showMessage("danger", "Please enter a valid email address");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (trimmedPassword.length < 6) {
      showMessage("danger", "Password must be at least 6 characters long");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      showMessage("danger", "Passwords do not match");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    setIsLoading(true);

    try {
      // Send signup request to backend
      const response = await fetch(API_ENDPOINTS.AUTH_SIGNUP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password: trimmedPassword,
          confirmPassword: trimmedConfirmPassword,
          gender: gender,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage("danger", data.message || "Signup failed");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setIsLoading(false);
        return;
      }

      // ✅ FIXED: Save complete user data with ID
      const userData = {
        _id: data.user._id || data.user.id,
        id: data.user._id || data.user.id,
        name: data.user.name,
        email: data.user.email,
        gender: data.user.gender,
        loginTime: new Date().toISOString(),
      };

      // ✅ Save in multiple formats for compatibility
      localStorage.setItem("currentUser", JSON.stringify(userData));
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("userId", userData._id); // ⭐ KEY LINE
      localStorage.setItem("isAuthenticated", "true");

      // ✅ CLEAR OLD CART & WISHLIST FOR NEW ACCOUNT
      // Fresh start for new user
      localStorage.removeItem("trymi_cart");
      localStorage.removeItem("trymi_wishlist");
      console.log("🧹 Fresh cart/wishlist for new account");

      // Fetch cart from backend
      try {
        const cartRes = await fetch(API_ENDPOINTS.CART(userId));
        if (cartRes.ok) {
          const cartData = await cartRes.json();
          if (cartData.success && cartData.items && cartData.items.length > 0) {
            const cartKey = `trymi_cart_${userId}`;
            localStorage.setItem(cartKey, JSON.stringify(cartData.items));
            console.log(
              "✅ Cart fetched from backend:",
              cartData.items.length,
              "items",
            );
          }
        }
      } catch (err) {
        console.warn("⚠️ Failed to fetch cart from backend:", err.message);
      }

      // Fetch wishlist from backend
      try {
        const wishRes = await fetch(API_ENDPOINTS.WISHLIST(userId));
        if (wishRes.ok) {
          const wishData = await wishRes.json();
          if (wishData.items && wishData.items.length > 0) {
            const wishKey = `trymi_wishlist_${userId}`;
            localStorage.setItem(wishKey, JSON.stringify(wishData.items));
            console.log(
              "✅ Wishlist fetched from backend:",
              wishData.items.length,
              "items",
            );
          }
        }
      } catch (err) {
        console.warn("⚠️ Failed to fetch wishlist from backend:", err.message);
      }

      console.log("✅ User signed up successfully:", userData);
      console.log("✅ User ID saved:", userData._id);

      setIsLoading(false);
      setShowSuccess(true);
      showMessage("success", "Account created successfully! Redirecting...");

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setGender("");

      setTimeout(() => {
        navigate("/outfit-predictor");
      }, 2000);
    } catch (error) {
      console.error("Signup error:", error);
      showMessage("danger", "Network error. Please check your connection.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setIsLoading(false);
    }
  };

  const getInputStyle = (hasValue, isFocused) => ({
    width: "100%",
    padding: "15px 20px",
    fontSize: "1rem",
    border: isFocused
      ? "2px solid #000"
      : hasValue
        ? "2px solid #000"
        : "2px solid rgba(0, 0, 0, 0.15)",
    borderRadius: "12px",
    boxSizing: "border-box",
    background: hasValue ? "#ffffff" : "rgba(255, 255, 255, 0.95)",
    color: "#2c3e50",
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    fontWeight: "500",
    boxShadow: isFocused
      ? "0 8px 20px rgba(0, 0, 0, 0.15), 0 0 0 4px rgba(0, 0, 0, 0.05)"
      : hasValue
        ? "0 4px 12px rgba(0, 0, 0, 0.12)"
        : "0 2px 8px rgba(0, 0, 0, 0.08)",
    paddingRight: "50px",
    outline: "none",
    transform: isFocused ? "translateY(-2px)" : "translateY(0)",
  });

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

  const radioContainerStyle = {
    display: "flex",
    gap: "20px",
    marginTop: "10px",
    flexWrap: "wrap",
  };

  const radioLabelStyle = (isSelected) => ({
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    padding: "12px 20px",
    borderRadius: "12px",
    border: isSelected ? "2px solid #1a1a1a" : "2px solid rgba(0, 0, 0, 0.15)",
    background: isSelected ? "#f9f9f9" : "rgba(255, 255, 255, 0.95)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    fontWeight: isSelected ? "600" : "500",
    fontSize: "0.95rem",
    color: "#2c3e50",
    boxShadow: isSelected
      ? "0 4px 12px rgba(0, 0, 0, 0.12)"
      : "0 2px 8px rgba(0, 0, 0, 0.08)",
    transform: isSelected ? "translateY(-2px)" : "translateY(0)",
  });

  const radioInputStyle = {
    marginRight: "8px",
    accentColor: "#1a1a1a",
    width: "18px",
    height: "18px",
    cursor: "pointer",
  };

  const styles = {
    btnSignup: {
      background: isLoading
        ? "linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)"
        : "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
      cursor: isLoading ? "not-allowed" : "pointer",
    },
    signupBox: {
      animation: isShaking
        ? "shake 0.5s"
        : "scaleIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
    },
    passwordStrengthBar: {
      width: "100%",
      height: "4px",
      background: "#e5e7eb",
      borderRadius: "2px",
      marginTop: "8px",
      overflow: "hidden",
    },
    passwordStrengthFill: {
      height: "100%",
      transition: "all 0.3s ease",
      borderRadius: "2px",
    },
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 1) return "#ef4444";
    if (passwordStrength === 2) return "#f59e0b";
    if (passwordStrength === 3) return "#10b981";
    return "#e5e7eb";
  };

  const getPasswordStrengthWidth = () => {
    return `${(passwordStrength / 3) * 100}%`;
  };

  return (
    <div className="signup-container">
      <div
        style={styles.decorativeCircle1}
        className="signup-decorative-circle-1"
      ></div>
      <div
        style={styles.decorativeCircle2}
        className="signup-decorative-circle-2"
      ></div>

      {showSuccess && (
        <div className="signup-celebration">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="signup-confetti"
              style={{
                left: `${Math.random() * 100 - 50}px`,
                top: `${Math.random() * 100 - 50}px`,
                background: ["#1dbc08", "#667eea", "#764ba2", "#f59e0b"][
                  Math.floor(Math.random() * 4)
                ],
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* ✅ MOBILE NAVBAR WITH HAMBURGER MENU */}
      <nav className="signup-navbar">
        <div>
          <h4 className="signup-navbar-logo">TRYMI</h4>
        </div>
        <ul className={`signup-nav-links ${menuOpen ? "active" : ""}`}>
          <li>
            <Link to="/about" className="signup-nav-link" onClick={closeMenu}>
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

      <div className="signup-main-container">
        <div className={`signup-box ${isShaking ? "shake" : "scale-in"}`}>
          <h2 className="signup-heading">Create Account</h2>

          <p className="signup-subheading">
            Join TRYMI and discover your perfect outfit ✨
          </p>

          <form onSubmit={handleSubmit}>
            <div
              className="signup-form-group"
              style={{ animationDelay: "0.1s" }}
            >
              <label className="signup-label">
                Full Name
                {name.length > 0 && (
                  <span style={{ color: "#000", marginLeft: "5px" }}>✓</span>
                )}
              </label>
              <input
                type="text"
                style={getInputStyle(name.length > 0, focusedField === "name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField("")}
                placeholder="Enter your full name"
                required
                autoComplete="name"
              />
            </div>

            <div
              className="signup-form-group"
              style={{ animationDelay: "0.15s" }}
            >
              <label className="signup-label">
                Email Address
                {email.length > 0 && validateEmail(email) && (
                  <span style={{ color: "#000", marginLeft: "5px" }}>✓</span>
                )}
              </label>
              <input
                type="email"
                style={getInputStyle(
                  email.length > 0,
                  focusedField === "email",
                )}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField("")}
                placeholder="Enter your email"
                required
                autoComplete="email"
              />
            </div>

            {/* Gender Selection Field */}
            <div
              className="signup-form-group"
              style={{ animationDelay: "0.2s" }}
            >
              <label className="signup-label">
                Gender
                {gender && (
                  <span style={{ color: "#000", marginLeft: "5px" }}>✓</span>
                )}
              </label>
              <div style={radioContainerStyle}>
                <label style={radioLabelStyle(gender === "male")}>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === "male"}
                    onChange={(e) => setGender(e.target.value)}
                    style={radioInputStyle}
                    required
                  />
                  Male
                </label>
                <label style={radioLabelStyle(gender === "female")}>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === "female"}
                    onChange={(e) => setGender(e.target.value)}
                    style={radioInputStyle}
                    required
                  />
                  Female
                </label>
                <label style={radioLabelStyle(gender === "other")}>
                  <input
                    type="radio"
                    name="gender"
                    value="other"
                    checked={gender === "other"}
                    onChange={(e) => setGender(e.target.value)}
                    style={radioInputStyle}
                    required
                  />
                  Other
                </label>
              </div>
            </div>

            <div
              className="signup-form-group"
              style={{ animationDelay: "0.25s" }}
            >
              <label className="signup-label">
                Password
                {password.length >= 6 && (
                  <span style={{ color: "#000", marginLeft: "5px" }}>✓</span>
                )}
              </label>
              <input
                type={showPassword ? "text" : "password"}
                style={getInputStyle(
                  password.length > 0,
                  focusedField === "password",
                )}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField("")}
                placeholder="Create a password (min 6 characters)"
                required
                autoComplete="new-password"
                minLength="6"
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

              {password.length > 0 && (
                <div style={styles.passwordStrengthBar}>
                  <div
                    style={{
                      ...styles.passwordStrengthFill,
                      width: getPasswordStrengthWidth(),
                      background: getPasswordStrengthColor(),
                    }}
                  />
                </div>
              )}
              {password.length > 0 && (
                <p
                  style={{
                    fontSize: "0.75rem",
                    color:
                      passwordStrength === 3
                        ? "#000"
                        : getPasswordStrengthColor(),
                    marginTop: "6px",
                    fontWeight: "600",
                    animation: "fadeIn 0.3s ease-out",
                  }}
                >
                  {passwordStrength === 1 && "Weak password"}
                  {passwordStrength === 2 && "Good password"}
                  {passwordStrength === 3 && "Strong password"}
                </p>
              )}
            </div>

            <div
              className="signup-form-group"
              style={{ animationDelay: "0.3s" }}
            >
              <label className="signup-label">
                Confirm Password
                {confirmPassword.length > 0 && confirmPassword === password && (
                  <span style={{ color: "#000", marginLeft: "5px" }}>✓</span>
                )}
              </label>
              <input
                type={showConfirmPassword ? "text" : "password"}
                style={getInputStyle(
                  confirmPassword.length > 0,
                  focusedField === "confirmPassword",
                )}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setFocusedField("confirmPassword")}
                onBlur={() => setFocusedField("")}
                placeholder="Confirm your password"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                style={eyeIconStyle}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>

            <button
              type="submit"
              className="signup-btn"
              style={styles.btnSignup}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="signup-spinner"></span>
                  Creating Account...
                </>
              ) : showSuccess ? (
                <>
                  <span className="signup-checkmark"></span>
                  Account Created!
                </>
              ) : (
                "Create Account"
              )}
            </button>

            {message.text && (
              <div
                className={`signup-alert ${
                  message.type === "success"
                    ? "signup-alert-success"
                    : "signup-alert-danger"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="signup-footer">
              <p className="signup-footer-text">
                Already have an account?{" "}
                <Link to="/login" className="signup-footer-link">
                  Login here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;


