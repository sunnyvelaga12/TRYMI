import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const StudioLanding = () => {
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);
  const [aiStatus, setAiStatus] = useState({
    status: "Checking...",
    message: "Connecting to AI servers...",
    isActive: true,
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await axios.get("https://trymi-ai.onrender.com/api/ai-status");
        setAiStatus(response.data);
      } catch (err) {
        setAiStatus({
          status: "🔴 Offline",
          message: "AI Engine is starting up...",
          isActive: false,
        });
      }
    };
    checkStatus();
  }, []);

  return (
    <div className="studio-landing">
      {/* 1. HERO SECTION */}
      <div className="studio-hero">
        <h1>Virtual Try-On Studio</h1>
        <p className="studio-tagline">
          Try on any look from our collection. See how clothes fit before you buy.
        </p>
      </div>

      {/* 2. IMPORTANT NOTE & STATUS SECTION (Correct Position) */}
      <div
        className="important-note-container"
        style={{
          margin: "20px auto",
          maxWidth: "800px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "12px",
          background: "#fdfdfd",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
        }}
      >
        <h3 style={{ marginTop: 0, color: "#333", display: "flex", alignItems: "center", gap: "8px" }}>
          ⚠️ Important Note
        </h3>

        <div
          className={`status-banner ${aiStatus.isActive ? "active" : "busy"}`}
          style={{
            padding: "16px",
            textAlign: "center",
            borderRadius: "8px",
            background: aiStatus.status.includes("Fast") ? "#e8f5e9" : "#fff3e0",
            border: `1px solid ${aiStatus.status.includes("Fast") ? "#4caf50" : "#ff9800"}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div>
            <strong>AI Status: {aiStatus.status}</strong> — {aiStatus.message}
          </div>

          {/* Show Preview Button only if AI is not "Fast" (Ready) */}
          {!aiStatus.status.includes("Fast") && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#ff9800",
                color: "white",
                border: "none",
                borderRadius: "20px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.9rem",
                transition: "transform 0.2s"
              }}
              onMouseOver={(e) => e.target.style.transform = "scale(1.05)"}
              onMouseOut={(e) => e.target.style.transform = "scale(1)"}
            >
              {showPreview ? "Close Preview ✕" : "🎥 Watch How it Works"}
            </button>
          )}
        </div>

        {/* CONDITIONAL VIDEO SECTION */}
        {showPreview && (
          <div className="video-preview-section" style={{ marginTop: "20px", textAlign: "center" }}>
            <h4 style={{ marginBottom: "15px", color: "#444", lineHeight: "1.5", fontSize: "0.95rem" }}>
              Since we use <b>HuggingFace free spaces</b>, they may occasionally sleep.
              Check this preview to see the high-quality generation you'll receive
              when spaces are active:
              <b>
                Watch this video to see how it works:
              </b>
            </h4>
            <div
              style={{
                position: "relative",
                paddingBottom: "56.25%",
                height: 0,
                overflow: "hidden",
                borderRadius: "12px",
                background: "#000",
                boxShadow: "0 10px 20px rgba(0,0,0,0.2)"
              }}
            >
              <video
                controls
                autoPlay
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                }}
              >
                <source src="/assets/videos/tryon_demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "12px", fontStyle: "italic" }}>
              AI processing demonstration (60s)
            </p>
          </div>
        )}
      </div>

      {/* 3. MAIN FEATURES */}
      <div className="studio-features">
        <div
          className="feature-card clickable-card"
          onClick={() => navigate("/studio/upload")}
        >
          <div className="feature-icon">📸</div>
          <h3>Upload Your Photo</h3>
          <p>Take or upload a full-body photo in good lighting</p>
          <button className="card-action-btn">Get Started →</button>
        </div>
      </div>

      {/* 4. CTA BUTTONS */}
      <div className="studio-cta">
        <button className="btn-primary-studio" onClick={() => navigate("/studio/upload")}>
          Start Trying On
        </button>
        <button className="btn-secondary-studio" onClick={() => navigate("/studio/my-looks")}>
          My Saved Looks
        </button>
      </div>

      {/* 5. GUIDELINES */}
      <div className="studio-guidelines">
        <h3>📋 Photo Guidelines for Best Results</h3>
        <div className="guidelines-grid">
          <div className="guideline-item"><span>✅</span><strong>Full Body</strong></div>
          <div className="guideline-item"><span>💡</span><strong>Good Light</strong></div>
          <div className="guideline-item"><span>🎨</span><strong>Plain BG</strong></div>
          <div className="guideline-item"><span>👤</span><strong>Solo</strong></div>
        </div>
      </div>

      <button className="studio-nav-back" onClick={() => navigate("/collections")}>
        Back to Collection
      </button>
    </div>
  );
};

export default StudioLanding;


