import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./TryOnResult.css";

const TryOnResult = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);
  const [resultImageError, setResultImageError] = useState(false);
  const [originalImageError, setOriginalImageError] = useState(false);
  const [resultImageLoaded, setResultImageLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimer, setRetryTimer] = useState(0);
  const [showVideoPreview, setShowVideoPreview] = useState(false); // ✅ Video section state

  const location = useLocation();
  const navigate = useNavigate();

  const getDisplayUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("data:")) return path;
    const API_BASE = "https://trymi-backend.onrender.com";
    return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const FALLBACK_ORIGINAL =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600"%3E%3Crect width="400" height="600" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" font-size="20" text-anchor="middle" fill="%23666"%3EOriginal Photo%3C/text%3E%3C/svg%3E';
  const FALLBACK_RESULT =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600"%3E%3Crect width="400" height="600" fill="%23e8f5e9"/%3E%3Ctext x="50%25" y="50%25" font-size="20" text-anchor="middle" fill="%23666"%3EResult Image%3C/text%3E%3C/svg%3E';
  const FALLBACK_OUTFIT =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600"%3E%3Crect width="400" height="600" fill="%23fff3e0"/%3E%3Ctext x="50%25" y="50%25" font-size="20" text-anchor="middle" fill="%23666"%3ESelected Outfit%3C/text%3E%3C/svg%3E';

  useEffect(() => {
    if (location.state?.resultId) {
      fetchResult(location.state.resultId);
    } else if (location.state?.result) {
      setResult(location.state.result);
      setLoading(false);
    } else {
      setLoading(false);
      navigate("/studio");
    }
  }, [location.state, navigate]);

  const fetchResult = async (resultId) => {
    try {
      const response = await axios.get(
        `https://trymi-backend.onrender.com/api/studio/result/${resultId}`,
      );

      // 🔁 Handle delayed / processing states safely
      if (
        (response.data.status === "processing" ||
          response.data.status === "pending") &&
        retryTimer < 10
      ) {
        setRetryTimer((prev) => prev + 1);
        setTimeout(() => fetchResult(resultId), 5000);
        return;
      }

      // ✅ Success path (AI OR fallback image)
      setResult(response.data);
      setLoading(false);
    } catch (error) {
      console.error("❌ fetchResult failed:", error);

      /**
       * ✅ IMPORTANT FIX:
       * Do NOT redirect or alert.
       * Show a graceful fallback instead.
       */

      setResult({
        warning:
          "AI server is currently unavailable. Showing selected product image instead.",
        resultImageUrl: FALLBACK_OUTFIT, // 👈 selected product image placeholder
        originalPhotoUrl: FALLBACK_ORIGINAL,
        animatedUrl: null,
      });

      setLoading(false);
    }
  };

  const saveToMyLooks = async () => {
    try {
      const userId =
        localStorage.getItem("userId") || localStorage.getItem("userEmail");
      if (!userId) return alert("Please login to save looks!");
      await axios.post("https://trymi-backend.onrender.com/api/studio/save-look", {
        resultId: result.id,
      });
      alert("✅ Saved to My Looks!");
    } catch (error) {
      alert("Failed to save.");
    }
  };

  const downloadImage = async () => {
    try {
      const imageUrl = getDisplayUrl(
        showAnimation && result.animatedUrl
          ? result.animatedUrl
          : result.resultImageUrl,
      );
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `trymi-${Date.now()}.jpg`;
      link.click();
    } catch (error) {
      alert("Download failed.");
    }
  };

  const handleResultImageError = (e) => {
    if (retryCount > 2) {
      setResultImageError(true);
      return;
    }
    setRetryCount((prev) => prev + 1);
    e.target.src = result?.productImage
      ? getDisplayUrl(result.productImage)
      : FALLBACK_RESULT;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Creating your virtual try-on...</p>
        <p className="loading-subtext">
          {retryTimer > 0
            ? `AI is working... (${retryTimer}/10)`
            : "Taking 30-60s"}
        </p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="tryon-result-container">
      <h2>✨ Your Virtual Try-On</h2>

      {/* ✅ NEW VIDEO PREVIEW SECTION */}
      <div
        className="important-note-container"
        style={{
          margin: "20px auto",
          maxWidth: "800px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "12px",
          background: "#fdfdfd",
          textAlign: "center",
        }}
      >
        <h3 style={{ marginTop: 0 }}>⚠️ Processing Note</h3>
        <p style={{ fontSize: "0.9rem", color: "#666" }}>
          The AI output quality depends on <b>HuggingFace spaces</b>{" "}
          availability. If the image below looks like a placeholder, come again
          after est 7:00 PM UTC. Meanwhile, watch this video to see the
          high-quality results usually generated:
          <b>
            Watch this video to see how it works:
          </b>
        </p>
        <button
          onClick={() => setShowVideoPreview(!showVideoPreview)}
          style={{
            padding: "10px 20px",
            backgroundColor: "#ff9800",
            color: "white",
            border: "none",
            borderRadius: "20px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {showVideoPreview ? "Close Preview ✕" : "🎥 Watch How it Works"}
        </button>

        {showVideoPreview && (
          <div style={{ marginTop: "20px" }}>
            <div
              style={{
                position: "relative",
                paddingBottom: "56.25%",
                height: 0,
                overflow: "hidden",
                borderRadius: "8px",
                background: "#000",
              }}
            >
              <video
                controls
                autoPlay
                muted
                playsInline
                loop
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
          </div>
        )}
      </div>

      {result.warning && (
        <div className="warning-banner">⚠️ {result.warning}</div>
      )}

      <div className="result-display">
        <div className="comparison-view">
          <div className="original-photo">
            <h4>ORIGINAL</h4>
            <div className="image-wrapper">
              <img
                src={getDisplayUrl(result.photoUrl || result.originalPhotoUrl)}
                alt="Original"
                onError={(e) => (e.target.src = FALLBACK_ORIGINAL)}
              />
            </div>
          </div>

          <div className="tryon-result">
            <h4>WITH OUTFIT</h4>
            <div className="image-wrapper">
              <img
                src={getDisplayUrl(
                  showAnimation && result.animatedUrl
                    ? result.animatedUrl
                    : result.resultImageUrl,
                )}
                alt="Result"
                onLoad={() => setResultImageLoaded(true)}
                onError={handleResultImageError}
              />
            </div>
            {result.animatedUrl && (
              <button
                className="animation-toggle"
                onClick={() => setShowAnimation(!showAnimation)}
              >
                {showAnimation ? "📷 Static" : "🎬 Animate"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="result-actions">
        <button
          className="btn-secondary-studio"
          onClick={() => navigate("/collections")}
        >
          ⬅ Back
        </button>
        <button className="btn-primary-studio" onClick={saveToMyLooks}>
          💾 Save to My Looks
        </button>

        {/* ✅ Buy Now Button */}
        {result?.productId && (
          <button
            className="btn-primary-studio"
            style={{ background: "#4CAF50" }}
            onClick={async () => {
              try {
                const userId = localStorage.getItem("userId") || localStorage.getItem("userEmail");
                if (!userId) return alert("Please login to buy!");

                await axios.post("https://trymi-backend.onrender.com/api/cart/add", {
                  userId,
                  productId: result.productId,
                  quantity: 1
                });

                navigate("/cart");
              } catch (err) {
                console.error(err);
                alert("Failed to add to cart");
              }
            }}
          >
            🛒 Buy Now
          </button>
        )}

        <button className="btn-secondary-studio" onClick={downloadImage}>
          ⬇️ Download
        </button>
      </div>
    </div>
  );
};

export default TryOnResult;


