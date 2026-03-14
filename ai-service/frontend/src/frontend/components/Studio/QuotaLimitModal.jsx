import React, { useState, useEffect } from "react";
import { Button, Text, VStack, HStack, Box } from "@chakra-ui/react";

/**
 * QuotaLimitModal - Shows when HuggingFace API or Spaces quota is exhausted
 * Displays when to retry and allows user to schedule a retry
 * Uses custom modal instead of Chakra Modal to avoid export issues
 */
const QuotaLimitModal = ({
  isOpen,
  onClose,
  quotaStatus = "available",
  resetTime = null,
  quotaType = "api", // 'api' or 'spaces'
}) => {
  const [timeUntilReset, setTimeUntilReset] = useState(null);
  const [resetTimeDisplay, setResetTimeDisplay] = useState("");

  useEffect(() => {
    if (!resetTime || !isOpen) return;

    const updateCountdown = () => {
      try {
        const resetDate = new Date(resetTime);
        const now = new Date();
        const diffMs = resetDate - now;

        if (diffMs <= 0) {
          setTimeUntilReset(null);
          setResetTimeDisplay("Reset time has passed - try again!");
          return;
        }

        // Calculate time units
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

        setTimeUntilReset({ hours, minutes, seconds });

        // Format display string
        let display = "";
        if (hours > 0) {
          display = `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
          display = `${minutes}m ${seconds}s`;
        } else {
          display = `${seconds}s`;
        }

        setResetTimeDisplay(display);
      } catch (error) {
        console.error("Error calculating countdown:", error);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [resetTime, isOpen]);

  const handleSetReminder = () => {
    if (resetTime) {
      // Store reminder in localStorage
      localStorage.setItem("quotaResetTime", resetTime);
      localStorage.setItem("quotaType", quotaType);
      alert(
        `⏰ Reminder set! We'll remind you when quota resets.\n\nReset Time: ${new Date(resetTime).toLocaleString()}`,
      );
      onClose();
    }
  };

  const quotaLabel =
    quotaType === "api" ? "HuggingFace API" : "HuggingFace Spaces (Free Tier)";
  const quotaIcon = quotaType === "api" ? "🔑" : "☁️";

  if (!isOpen) return null;

  // Custom modal using divs to avoid Chakra modal export issues
  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          style={{
            backgroundColor: "#222",
            borderRadius: "12px",
            maxWidth: "500px",
            width: "90%",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: "24px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "24px" }}>⏳</span>
            <span
              style={{ color: "#fff", fontSize: "18px", fontWeight: "bold" }}
            >
              Quota Limit Reached
            </span>
          </div>

          {/* Body */}
          <div style={{ padding: "24px", color: "#ddd" }}>
            {/* Quota Type Info */}
            <div
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "rgba(255, 193, 7, 0.1)",
                borderRadius: "8px",
                borderLeft: "4px solid #ffc107",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  color: "#ffc107",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                {quotaIcon} {quotaLabel} Quota Exhausted
              </div>
            </div>

            {/* Explanation */}
            <div
              style={{
                color: "#ccc",
                fontSize: "13px",
                lineHeight: "1.6",
                marginBottom: "16px",
              }}
            >
              {quotaType === "api"
                ? "We've reached the daily limit for HuggingFace API. However, you can use the free tier with a short wait time."
                : "The free tier quota has been temporarily exhausted due to high demand. This typically resets within an hour."}
            </div>

            {/* Reset Time */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{ color: "#aaa", fontSize: "12px", marginBottom: "8px" }}
              >
                ⏰ Time Until Reset:
              </div>
              <div
                style={{
                  padding: "12px",
                  backgroundColor: "rgba(76, 175, 80, 0.1)",
                  borderRadius: "8px",
                  border: "1px solid rgba(76, 175, 80, 0.3)",
                }}
              >
                <div
                  style={{
                    color: "#4caf50",
                    fontSize: "20px",
                    fontWeight: "bold",
                    textAlign: "center",
                    fontFamily: "monospace",
                  }}
                >
                  {resetTimeDisplay || "Calculating..."}
                </div>
                {resetTime && (
                  <div
                    style={{
                      color: "#888",
                      fontSize: "11px",
                      textAlign: "center",
                      marginTop: "8px",
                    }}
                  >
                    Reset at: {new Date(resetTime).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>

            {/* What Can You Do */}
            <div>
              <div
                style={{
                  color: "#aaa",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                }}
              >
                What You Can Do:
              </div>
              <div style={{ paddingLeft: "16px" }}>
                <div
                  style={{
                    color: "#ddd",
                    fontSize: "12px",
                    marginBottom: "4px",
                  }}
                >
                  ✓ Wait for the quota to reset
                </div>
                <div
                  style={{
                    color: "#ddd",
                    fontSize: "12px",
                    marginBottom: "4px",
                  }}
                >
                  ✓ Come back at the time shown above
                </div>
                <div
                  style={{
                    color: "#ddd",
                    fontSize: "12px",
                    marginBottom: "4px",
                  }}
                >
                  ✓ Set a reminder so we can notify you
                </div>
                {quotaType === "spaces" && (
                  <div
                    style={{
                      color: "#ddd",
                      fontSize: "12px",
                      marginBottom: "4px",
                    }}
                  >
                    ✓ Usually resets within 1 hour
                  </div>
                )}
                {quotaType === "api" && (
                  <div style={{ color: "#ddd", fontSize: "12px" }}>
                    ✓ Daily quota resets at midnight (UTC)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
            }}
          >
            <button
              style={{
                padding: "8px 16px",
                backgroundColor: "#444",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
              }}
              onClick={onClose}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#555")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#444")}
            >
              Close
            </button>
            <button
              style={{
                padding: "8px 16px",
                backgroundColor: "#4caf50",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
              }}
              onClick={handleSetReminder}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#45a049")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#4caf50")}
            >
              🔔 Set Reminder
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuotaLimitModal;


