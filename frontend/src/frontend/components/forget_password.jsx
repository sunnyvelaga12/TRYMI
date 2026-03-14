import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/forgetpassword.css";

const ForgetPassword = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentStep, setCurrentStep] = useState("email");
  const [generatedOTP, setGeneratedOTP] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isShaking, setIsShaking] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
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

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password strength calculation
  React.useEffect(() => {
    if (newPassword.length === 0) {
      setPasswordStrength(0);
    } else if (newPassword.length < 6) {
      setPasswordStrength(1);
    } else if (newPassword.length < 10) {
      setPasswordStrength(2);
    } else {
      setPasswordStrength(3);
    }
  }, [newPassword]);

  // Show message function with longer duration
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 5000);
  };

  const sendOTP = async () => {
    setIsLoading(true);

    const trimmedEmail = email.trim();

    if (!validateEmail(trimmedEmail)) {
      showMessage("danger", "Please enter a valid email address.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setIsLoading(false);
      return;
    }

    try {
      console.log(
        "📤 Calling backend /api/auth/send-otp with email:",
        trimmedEmail,
      );

      // Call the backend API to send OTP email
      const response = await fetch("https://trymi-backend.onrender.com/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ Backend error:", data);
        showMessage(
          "danger",
          data.message || "Failed to send OTP. Please check your email.",
        );
        setIsLoading(false);
        return;
      }

      console.log("✅ Backend response:", data);

      // Store OTP from response if provided (fallback scenario)
      if (data.otp) {
        setGeneratedOTP(data.otp);
        console.log("Generated OTP (fallback):", data.otp);
      }

      const isEmailSent = data.emailSent;
      const displayMessage = isEmailSent 
        ? (data.message || "OTP sent successfully! Check your inbox.")
        : (data.otp ? `⚠️ Email service unavailable. FOR TESTING, use OTP: ${data.otp}` : "Failed to send OTP.");

      showMessage(isEmailSent ? "success" : "warning", displayMessage);
      setCurrentStep("otp");
      setIsLoading(false);
    } catch (error) {
      console.error("❌ Error sending OTP:", error);
      showMessage("danger", "Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const resendOTP = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showMessage("danger", "Please enter your email first.");
      return;
    }
    sendOTP();
  };

  const verifyOTP = async () => {
    if (!otp) {
      showMessage("danger", "Please enter the OTP.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    try {
      console.log("📋 Verifying OTP with backend...");
      const response = await fetch(
        "https://trymi-backend.onrender.com/api/auth/verify-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            otp: otp,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ OTP verification failed:", data);
        showMessage("danger", data.message || "Invalid OTP. Please try again.");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        return;
      }

      console.log("✅ OTP verified successfully");
      showMessage("success", "OTP verified! You can now reset your password.");
      setCurrentStep("reset");
    } catch (error) {
      console.error("❌ Error verifying OTP:", error);
      showMessage("danger", "Network error. Please try again.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    sendOTP();
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showMessage("danger", "Passwords do not match. Please try again.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (newPassword.length < 6) {
      showMessage("danger", "Password must be at least 6 characters long.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    try {
      console.log("🔐 Resetting password via backend...");
      const response = await fetch(
        "https://trymi-backend.onrender.com/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            otp: otp,
            newPassword: newPassword,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ Password reset failed:", data);
        showMessage(
          "danger",
          data.message || "Failed to reset password. Please try again.",
        );
        return;
      }

      console.log("✅ Password reset successful");
      showMessage(
        "success",
        "Password reset successful! Redirecting to login...",
      );

      // Clear any existing session
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");

      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      console.error("❌ Error resetting password:", error);
      showMessage("danger", "Network error. Please try again.");
    }
  };

  // Dynamic input styling
  const getInputStyle = (hasValue, isFocused) => ({
    width: "100%",
    padding: "14px 18px",
    fontSize: "0.95rem",
    border: isFocused
      ? "2px solid #000"
      : hasValue
        ? "2px solid rgba(0, 0, 0, 0.3)"
        : "2px solid rgba(150, 150, 150, 0.4)",
    borderRadius: "12px",
    boxSizing: "border-box",
    background: hasValue
      ? "rgba(255, 255, 255, 0.95)"
      : "rgba(250, 250, 250, 0.8)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    color: "#333",
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    fontWeight: "500",
    letterSpacing: "0.3px",
    boxShadow: isFocused
      ? "0 4px 12px rgba(212, 175, 55, 0.25)"
      : hasValue
        ? "0 2px 8px rgba(212, 175, 55, 0.15)"
        : "0 1px 3px rgba(0, 0, 0, 0.1)",
    outline: "none",
    transform: isFocused ? "translateY(-2px)" : "translateY(0)",
  });

  const eyeIconStyle = {
    position: "absolute",
    right: "15px",
    top: "50%",
    transform: "translateY(-50%)",
    cursor: "pointer",
    fontSize: "1.2rem",
    color: "#000",
    transition: "all 0.3s ease",
    zIndex: 10,
    background: "none",
    border: "none",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 1) return "#ef4444";
    if (passwordStrength === 2) return "#f59e0b";
    if (passwordStrength === 3) return "var(--accent)";
    return "#e5e7eb";
  };

  const getPasswordStrengthWidth = () => {
    return `${(passwordStrength / 3) * 100}%`;
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 1) return "Weak password";
    if (passwordStrength === 2) return "Good password";
    if (passwordStrength === 3) return "Strong password";
    return "";
  };

  const renderEmailForm = () => (
    <>
      <h2 className="forget-heading">Forget Password</h2>
      <p className="forget-subheading">Enter your email to receive OTP</p>

      <form onSubmit={handleEmailSubmit}>
        <div className="forget-form-group">
          <input
            type="email"
            className="forget-input"
            style={getInputStyle(email.length > 0, false)}
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            placeholder="Email address"
            required
          />
        </div>
        <button
          type="submit"
          className="forget-btn-primary"
          style={{
            opacity: isLoading ? 0.7 : 1,
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner-small"></span> Sending...
            </>
          ) : (
            "SEND OTP"
          )}
        </button>

        {message.text && (
          <div
            className={`forget-alert ${
              message.type === "success"
                ? "forget-alert-success"
                : "forget-alert-danger"
            }`}
          >
            {message.text}
          </div>
        )}
      </form>

      <div className="forget-footer">
        <p className="forget-footer-text">
          Remembered your password?{" "}
          <Link to="/login" className="forget-footer-link">
            Login
          </Link>
        </p>
      </div>
    </>
  );

  const renderOTPForm = () => (
    <>
      <h2 className="forget-heading">Enter OTP</h2>
      <p className="forget-subheading">We've sent a code to {email}</p>

      <form>
        <div className="forget-form-group">
          <input
            type="text"
            className="forget-otp-input"
            style={{
              ...getInputStyle(otp.length > 0, false),
              fontSize: "1.5rem",
              textAlign: "center",
              letterSpacing: "8px",
              fontWeight: "700",
            }}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            maxLength="6"
          />
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            type="button"
            onClick={resendOTP}
            className="forget-btn-outline"
            style={{ flex: 1 }}
          >
            Resend
          </button>
          <button
            type="button"
            onClick={verifyOTP}
            className="forget-btn-success"
            style={{ flex: 1 }}
          >
            Verify
          </button>
        </div>

        {message.text && (
          <div
            className={`forget-alert ${
              message.type === "success"
                ? "forget-alert-success"
                : "forget-alert-danger"
            }`}
          >
            {message.text}
          </div>
        )}
      </form>

      <div className="forget-footer">
        <p className="forget-footer-text">
          <Link to="/login" className="forget-footer-link">
            Back to Login
          </Link>
        </p>
      </div>
    </>
  );

  const renderResetForm = () => (
    <>
      <h2 className="forget-heading">Reset Password</h2>
      <p className="forget-subheading">Create a new strong password</p>

      <form onSubmit={handlePasswordReset}>
        <div className="forget-form-group" style={{ position: "relative" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#555",
              fontSize: "0.9rem",
              fontWeight: "600",
              letterSpacing: "0.5px",
            }}
          >
            New Password
            {newPassword.length >= 6 && (
              <span style={{ color: "#000", marginLeft: "5px" }}>✓</span>
            )}
          </label>
          <input
            type={showNewPassword ? "text" : "password"}
            className="forget-input"
            style={getInputStyle(newPassword.length > 0, false)}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password (min 6 characters)"
            required
            minLength="6"
          />
          <button
            type="button"
            style={eyeIconStyle}
            onClick={() => setShowNewPassword(!showNewPassword)}
            onMouseOver={(e) => {
              e.currentTarget.style.color = "var(--accent)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.15)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = "rgba(212, 175, 55, 0.8)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
            title={showNewPassword ? "Hide password" : "Show password"}
          >
            {showNewPassword ? "👁️" : "👁️‍🗨️"}
          </button>

          {/* Password Strength Indicator */}
          {newPassword.length > 0 && (
            <>
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  background: "#e5e7eb",
                  borderRadius: "2px",
                  marginTop: "8px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: getPasswordStrengthWidth(),
                    background: getPasswordStrengthColor(),
                    transition: "all 0.3s ease",
                    borderRadius: "2px",
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: getPasswordStrengthColor(),
                  marginTop: "6px",
                  fontWeight: "600",
                }}
              >
                {getPasswordStrengthText()}
              </p>
            </>
          )}
        </div>

        <div className="forget-form-group" style={{ position: "relative" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#555",
              fontSize: "0.9rem",
              fontWeight: "600",
              letterSpacing: "0.5px",
            }}
          >
            Confirm Password
            {confirmPassword.length > 0 && confirmPassword === newPassword && (
              <span style={{ color: "#000", marginLeft: "5px" }}>✓</span>
            )}
          </label>
          <input
            type={showConfirmPassword ? "text" : "password"}
            className="forget-input"
            style={getInputStyle(confirmPassword.length > 0, false)}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            required
          />
          <button
            type="button"
            style={eyeIconStyle}
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            onMouseOver={(e) => {
              e.currentTarget.style.color = "var(--accent)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1.15)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = "rgba(212, 175, 55, 0.8)";
              e.currentTarget.style.transform = "translateY(-50%) scale(1)";
            }}
            title={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
          </button>

          {/* Password Match Indicator */}
          {confirmPassword.length > 0 && (
            <p
              style={{
                fontSize: "0.75rem",
                color: confirmPassword === newPassword ? "#000" : "#ef4444",
                marginTop: "6px",
                fontWeight: "600",
              }}
            >
              {confirmPassword === newPassword
                ? "Passwords match"
                : "Passwords do not match"}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="forget-btn-primary"
          disabled={newPassword !== confirmPassword || newPassword.length < 6}
          style={{
            opacity:
              newPassword !== confirmPassword || newPassword.length < 6
                ? 0.6
                : 1,
            cursor:
              newPassword !== confirmPassword || newPassword.length < 6
                ? "not-allowed"
                : "pointer",
          }}
        >
          Reset Password
        </button>

        {message.text && (
          <div
            className={`forget-alert ${
              message.type === "success"
                ? "forget-alert-success"
                : "forget-alert-danger"
            }`}
          >
            {message.text}
          </div>
        )}
      </form>

      <div className="forget-footer">
        <p className="forget-footer-text">
          <Link to="/login" className="forget-footer-link">
            Back to Login
          </Link>
        </p>
      </div>
    </>
  );

  return (
    <div>
      {/* ✅ MOBILE NAVBAR WITH HAMBURGER MENU */}
      <nav className="forget-navbar">
        <div className="heading">
          <h4 className="forget-navbar-logo">TRYMI</h4>
        </div>
        <ul className={`forget-nav-links ${menuOpen ? "active" : ""}`}>
          <li>
            <Link to="/login" className="forget-nav-link" onClick={closeMenu}>
              Login
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

      <div className="forget-video-container">
        <video autoPlay muted loop playsInline className="forget-video">
          <source src="/example.2.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="forget-container">
        <div className={`forget-box ${isShaking ? "shake" : ""}`}>
          {currentStep === "email" && renderEmailForm()}
          {currentStep === "otp" && renderOTPForm()}
          {currentStep === "reset" && renderResetForm()}
        </div>
      </div>
    </div>
  );
};

export default ForgetPassword;


