import React, { useMemo } from "react";
import PropTypes from "prop-types";

const LoadingScreen = ({
  progress = 0,
  message = "Loading...",
  isVisible = true,
}) => {
  const safeProgress = useMemo(() => {
    try {
      const p = parseFloat(progress);
      if (isNaN(p)) return 0;
      return Math.max(0, Math.min(100, p));
    } catch (error) {
      return 0;
    }
  }, [progress]);

  const safeMessage = useMemo(() => {
    try {
      if (!message || typeof message !== "string") return "Loading...";
      return message.trim() || "Loading...";
    } catch (error) {
      return "Loading...";
    }
  }, [message]);

  if (!isVisible) return null;

  return (
    <div className="trymi-loading-overlay" role="status" aria-busy={true}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Inter:wght@300;400;500&display=swap');

          .trymi-loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: 'Inter', sans-serif;
            transition: opacity 0.5s ease;
          }

          .trymi-loading-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2rem;
            max-width: 400px;
            width: 90%;
          }

          .trymi-loader-ring {
            position: relative;
            width: 100px;
            height: 100px;
          }

          .trymi-loader-ring::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: 1px solid rgba(212, 175, 55, 0.1);
            border-radius: 50%;
          }

          .trymi-loader-ring::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: 2px solid transparent;
            border-top-color: #d4af37;
            border-radius: 50%;
            animation: trymi-spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
          }

          .trymi-loading-text {
            font-family: 'Cormorant Garamond', serif;
            font-size: 2.2rem;
            color: #1a1a1a;
            font-weight: 300;
            letter-spacing: 2px;
            text-align: center;
            margin: 0;
            animation: trymi-fade-in-out 2s ease-in-out infinite;
          }

          .trymi-progress-container {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.8rem;
          }

          .trymi-progress-track {
            width: 100%;
            height: 1px;
            background: rgba(0, 0, 0, 0.05);
            position: relative;
            overflow: hidden;
          }

          .trymi-progress-bar {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            background: #d4af37;
            transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .trymi-progress-percent {
            font-size: 0.75rem;
            color: #999;
            letter-spacing: 1px;
            text-transform: uppercase;
          }

          .trymi-warning-text {
            font-size: 0.85rem;
            color: #d4af37;
            text-align: center;
            letter-spacing: 0.5px;
            margin-top: 1rem;
            font-weight: 500;
            animation: trymi-fade-in-out 2s ease-in-out infinite;
          }

          @keyframes trymi-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes trymi-fade-in-out {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
        `}
      </style>

      <div className="trymi-loading-content">
        <div className="trymi-loader-ring" />

        <h2 className="trymi-loading-text">{safeMessage}</h2>

        {safeProgress > 0 && (
          <div className="trymi-progress-container">
            <div className="trymi-progress-track">
              <div
                className="trymi-progress-bar"
                style={{ width: `${safeProgress}%` }}
              />
            </div>
            <span className="trymi-progress-percent">
              {Math.round(safeProgress)}%
            </span>
          </div>
        )}

        <p className="trymi-warning-text">
          ⚠️ Please don't close this page
        </p>
      </div>
    </div>
  );
};

LoadingScreen.propTypes = {
  progress: PropTypes.number,
  message: PropTypes.string,
  isVisible: PropTypes.bool,
};

export default React.memo(LoadingScreen);


