import React, { useState, useEffect } from "react";
import { FaStar, FaTimes, FaCheckCircle, FaPaperPlane, FaCommentAlt } from "react-icons/fa";
import axios from "axios";
import "./FeedbackModal.css";

const API_URL = "https://trymi-backend.onrender.com";

const FeedbackModal = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(null);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setSubmitted(false);
      setMessage("");
      setRating(5);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const userData = localStorage.getItem("user");
      if (!userData) {
        setError("Please login to submit feedback.");
        setIsSubmitting(false);
        return;
      }

      const user = JSON.parse(userData);
      const feedbackData = {
        userId: user._id || user.id,
        userEmail: user.email,
        userName: user.name || "Anonymous",
        rating,
        category,
        message,
      };

      await axios.post(`${API_URL}/api/feedback/submit`, feedbackData);
      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      console.error("Feedback submission error:", err);
      setError("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="feedback-modal-overlay" onClick={onClose}>
      <div 
        className="feedback-modal-container" 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="feedback-close-btn" onClick={onClose}>
          <FaTimes />
        </button>

        {submitted ? (
          <div className="feedback-success-state">
            <div className="success-icon-wrapper">
              <FaCheckCircle className="success-icon" />
            </div>
            <h2>Thank You!</h2>
            <p>Your feedback helps us make TRYMI even better.</p>
          </div>
        ) : (
          <div className="feedback-form-wrapper">
            <div className="feedback-header">
              <FaCommentAlt className="header-icon" />
              <h2>Drop Feedback</h2>
              <p>We'd love to hear your thoughts on TRYMI</p>
            </div>

            <form onSubmit={handleSubmit} className="feedback-form">
              <div className="rating-section">
                <p className="section-label">Your Experience</p>
                <div className="star-rating">
                  {[...Array(5)].map((_, index) => {
                    const ratingValue = index + 1;
                    return (
                      <label key={index}>
                        <input
                          type="radio"
                          name="rating"
                          value={ratingValue}
                          onClick={() => setRating(ratingValue)}
                        />
                        <FaStar
                          className="star"
                          color={ratingValue <= (hover || rating) ? "#d4af37" : "#e4e5e9"}
                          size={32}
                          onMouseEnter={() => setHover(ratingValue)}
                          onMouseLeave={() => setHover(null)}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="category-section">
                <p className="section-label">Category</p>
                <div className="category-pills">
                  {["general", "bug", "feature", "complaint", "praise"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`category-pill ${category === cat ? "active" : ""}`}
                      onClick={() => setCategory(cat)}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="message-section">
                <p className="section-label">Message</p>
                <textarea
                  placeholder="Tell us what you liked or what we can improve..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  maxLength={1000}
                />
              </div>

              {error && <p className="feedback-error">{error}</p>}

              <button 
                type="submit" 
                className="feedback-submit-btn"
                disabled={isSubmitting || !message.trim()}
              >
                {isSubmitting ? (
                  <span className="feedback-spinner"></span>
                ) : (
                  <>
                    <FaPaperPlane /> <span>Send Feedback</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
