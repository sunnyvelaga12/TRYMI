import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useDisclosure } from "@chakra-ui/react";
import QuotaLimitModal from "./QuotaLimitModal";
import "./ClothingSelector.css";

import useWishlistStore from "../../../store/wishlistStore";

const ClothingSelector = () => {
  const { wishlist: wishlistItems } = useWishlistStore();
  const [selectedProduct, setSelectedProduct] = useState(null); // ✅ Back to single selection
  const [uploadedClothing, setUploadedClothing] = useState(null);
  const [activeTab, setActiveTab] = useState("wishlist");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  // Quota modal state
  const {
    isOpen: isQuotaModalOpen,
    onOpen: onQuotaModalOpen,
    onClose: onQuotaModalClose,
  } = useDisclosure();
  const [quotaModalData, setQuotaModalData] = useState({
    status: "available",
    resetTime: null,
    type: "api",
  });

  // ✅ New state for upload category
  const [uploadCategory, setUploadCategory] = useState("upper_body");

  const navigate = useNavigate();

  // ✅ Helper to classify Items
  const getCategoryType = (category) => {
    if (!category) return "upper_body"; // Default to top
    const lower = category.toLowerCase();
    // Full body: dresses, gowns, jumpsuits
    if (
      lower.includes("dress") ||
      lower.includes("gown") ||
      lower.includes("jumpsuit") ||
      lower.includes("saree") ||
      lower.includes("maxi") ||
      lower.includes("cocktail")
    ) {
      return "full_body";
    }
    // Lower body: pants, jeans, skirts, shorts
    if (
      lower.includes("pant") ||
      lower.includes("jean") ||
      lower.includes("skirt") ||
      lower.includes("short") ||
      lower.includes("bottom") ||
      lower.includes("trouser") ||
      lower.includes("legging") ||
      lower.includes("cargo") ||
      lower.includes("trackpant") ||
      lower.includes("jogger") ||
      lower.includes("chinos")
    ) {
      return "lower_body";
    }
    return "upper_body";
  };

  useEffect(() => {
    // Get user ID on component mount
    const detectedUserId = getUserId();
    setUserId(detectedUserId);
    console.log("🔑 Detected User ID:", detectedUserId);
  }, []);

  // ✅ COMPREHENSIVE USER ID DETECTION
  const getUserId = () => {
    console.log("🔍 Searching for user ID in localStorage...");

    // Method 1: Direct userId key
    let id = localStorage.getItem("userId");
    if (id && id !== "undefined" && id !== "null") {
      console.log("✅ Found userId directly:", id);
      return id;
    }

    // Method 2: From user object (most common)
    const userStr = localStorage.getItem("user");
    if (userStr && userStr !== "undefined" && userStr !== "null") {
      try {
        const user = JSON.parse(userStr);
        id = user._id || user.id || user.email;
        if (id) {
          console.log("✅ Found user ID from user:", id);
          return id;
        }
      } catch (e) {
        console.log("Failed to parse user:", e);
      }
    }

    // Method 3: From trymi_user object
    const trymiUserStr = localStorage.getItem("trymi_user");
    if (
      trymiUserStr &&
      trymiUserStr !== "undefined" &&
      trymiUserStr !== "null"
    ) {
      try {
        const user = JSON.parse(trymiUserStr);
        id = user._id || user.id || user.email;
        if (id) {
          console.log("✅ Found user ID from trymi_user:", id);
          return id;
        }
      } catch (e) {
        console.log("Failed to parse trymi_user:", e);
      }
    }

    // Method 4: From currentUser object
    const currentUserStr = localStorage.getItem("currentUser");
    if (
      currentUserStr &&
      currentUserStr !== "undefined" &&
      currentUserStr !== "null"
    ) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        id =
          currentUser._id ||
          currentUser.id ||
          currentUser.userId ||
          currentUser.email;
        if (id) {
          console.log("✅ Found user ID from currentUser:", id);
          return id;
        }
      } catch (e) {
        console.log("Failed to parse currentUser:", e);
      }
    }

    // Method 5: From userProfile
    const userProfileStr = localStorage.getItem("userProfile");
    if (userProfileStr && userProfileStr !== "undefined") {
      try {
        const userProfile = JSON.parse(userProfileStr);
        id = userProfile._id || userProfile.id || userProfile.email;
        if (id) {
          console.log("✅ Found user ID from userProfile:", id);
          return id;
        }
      } catch (e) {
        console.log("Failed to parse userProfile:", e);
      }
    }

    // Method 6: Try to get from session storage
    const sessionUserId = sessionStorage.getItem("userId");
    if (sessionUserId && sessionUserId !== "undefined") {
      console.log("✅ Found user ID from sessionStorage:", sessionUserId);
      return sessionUserId;
    }

    console.log("⚠️ No user ID found in any storage location");
    return null;
  };

  const handleProductSelect = (product) => {
    console.log("✨ Selected product:", product);
    console.log("   - ID:", product._id || product.id);
    console.log("   - Name:", product.name || product.title);
    console.log("   - Image:", product.image);

    setSelectedProduct(product);
    setUploadedClothing(null);
  };

  const handleClothingUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("⚠️ Please upload an image file");
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(
          "⚠️ Image is too large. Please upload an image smaller than 10MB.",
        );
        return;
      }

      console.log("📸 Clothing screenshot uploaded:", file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedClothing({
          file,
          preview: reader.result,
        });
        setSelectedProduct(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ Progress simulation for better UX
  const simulateProgress = () => {
    const steps = [
      { percent: 10, message: "📸 Analyzing your photo...", delay: 2000 },
      { percent: 20, message: "🧍 Detecting body pose...", delay: 5000 },
      { percent: 35, message: "🎨 Removing background...", delay: 8000 },
      { percent: 50, message: "👕 Processing clothing...", delay: 12000 },
      { percent: 65, message: "🤖 AI generating try-on...", delay: 30000 },
      { percent: 80, message: "🌈 Color matching...", delay: 45000 },
      { percent: 90, message: "✨ Adding final touches...", delay: 60000 },
      { percent: 95, message: "🎉 Almost done...", delay: 80000 },
    ];

    let currentStep = 0;
    const startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;

      // Find appropriate step based on elapsed time
      const currentStepData = steps.find((step, index) => {
        const nextStep = steps[index + 1];
        return elapsed >= step.delay && (!nextStep || elapsed < nextStep.delay);
      });

      if (currentStepData) {
        setProgress(currentStepData.percent);
        setProgressMessage(currentStepData.message);
      }
    };

    const interval = setInterval(updateProgress, 1000);
    return interval;
  };

  // ✅ Check AI service health
  const checkAIService = async () => {
    try {
      const response = await axios.get("http://localhost:5001/health", {
        timeout: 5000,
      });
      return {
        available: true,
        modelLoaded: response.data.model_loaded,
      };
    } catch (error) {
      console.warn("⚠️ AI service check failed:", error.message);
      return {
        available: false,
        modelLoaded: false,
      };
    }
  };

  const generateTryOn = async () => {
    const photoId = localStorage.getItem("studioPhotoId");

    console.log("🔍 Checking photo ID:", photoId);

    if (!photoId || photoId === "null" || photoId === "undefined") {
      alert(
        "⚠️ Please upload your photo first!\n\nGo to Studio > Upload Photo to get started.",
      );
      navigate("/studio/upload");
      return;
    }

    if (!selectedProduct && !uploadedClothing) {
      alert("⚠️ Please select an outfit or upload a clothing image");
      return;
    }

    // ✅ Check AI service before starting
    setProgress(5);
    setProgressMessage("🔍 Checking AI service...");
    setIsGenerating(true);

    const aiStatus = await checkAIService();

    if (!aiStatus.available) {
      const proceed = window.confirm(
        "⚠️ AI Service Not Available\n\n" +
        "The AI service is not running or not responding.\n\n" +
        "You can still proceed with a simple overlay method (faster but less realistic).\n\n" +
        "Would you like to continue?",
      );

      if (!proceed) {
        setIsGenerating(false);
        setProgress(0);
        setProgressMessage("");
        return;
      }
    }

    console.log("🎨 Starting try-on generation...");
    console.log("📸 Photo ID:", photoId);
    console.log("👕 Selected Product:", selectedProduct);
    console.log("📁 Uploaded Clothing:", uploadedClothing);
    console.log("📑 Active Tab:", activeTab);
    console.log(
      "🤖 AI Service:",
      aiStatus.available ? "Available" : "Unavailable",
    );
    console.log("🧠 Model Loaded:", aiStatus.modelLoaded);

    // Start progress simulation
    const progressInterval = simulateProgress();

    try {
      // ✅ Use FormData to send data
      const formData = new FormData();
      formData.append("photoId", photoId);

      // ✅ Handle product from wishlist
      if (activeTab === "wishlist" && selectedProduct) {
        const productId = selectedProduct._id || selectedProduct.id;
        const clothingImage = selectedProduct.image;
        const productName = selectedProduct.name || selectedProduct.title;

        // ✅ Validate that product has an image
        if (!clothingImage) {
          clearInterval(progressInterval);
          alert(
            "⚠️ This product doesn't have an image. Please choose another item or add products with images from the Admin Dashboard.",
          );
          setIsGenerating(false);
          setProgress(0);
          setProgressMessage("");
          return;
        }

        formData.append("productId", productId);
        formData.append("clothingImageUrl", clothingImage);

        console.log("   - Product Name:", productName);
        console.log("   - Image URL:", clothingImage);

        // ✅ Add Category for AI
        const category = getCategoryType(selectedProduct.category);
        formData.append("category", category);
        formData.append("productName", productName); // Send name for better AI routing
        console.log("   - Category:", category);
        console.log("   - Product Name:", productName);
      }
      // ✅ Handle uploaded clothing screenshot
      else if (activeTab === "upload" && uploadedClothing) {
        formData.append("clothingImage", uploadedClothing.file);
        // ✅ Add Category for AI (from state)
        formData.append("category", uploadCategory);
        // ✅ Add default name for recovery
        const uploadName = uploadCategory === "lower_body" ? "Uploaded Pants" : "Uploaded Top";
        formData.append("productName", uploadName);

        console.log(
          "📸 Using uploaded screenshot:",
          uploadedClothing.file.name,
        );
        console.log("   - Category:", uploadCategory);
        console.log("   - Product Name:", uploadName);
        console.log(
          "   - File size:",
          (uploadedClothing.file.size / 1024).toFixed(2),
          "KB",
        );
        console.log("   - File type:", uploadedClothing.file.type);
      }

      console.log("📤 Sending request to backend...");

      // ✅ Log FormData contents for debugging
      console.log("📋 FormData contents:");
      for (let pair of formData.entries()) {
        if (pair[1] instanceof File) {
          console.log(`   ${pair[0]}: [File] ${pair[1].name}`);
        } else {
          console.log(`   ${pair[0]}: ${pair[1]}`);
        }
      }

      const response = await axios.post(
        "https://trymi-backend.onrender.com/api/studio/generate-tryon",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 300000, // ✅ 5 minutes timeout
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            if (percentCompleted < 100) {
              console.log("📤 Upload progress:", percentCompleted + "%");
            }
          },
        },
      );

      // Clear progress interval
      clearInterval(progressInterval);
      setProgress(100);
      setProgressMessage("✅ Complete! Redirecting...");

      console.log("✅ Try-on generated successfully!");
      console.log("Response:", response.data);

      // Small delay to show completion
      setTimeout(() => {
        navigate("/studio/result", {
          state: {
            resultId: response.data.resultId,
            result: response.data,
          },
        });
      }, 1000);
    } catch (error) {
      clearInterval(progressInterval);
      console.error("❌ Try-on generation error:", error);

      setIsGenerating(false);
      setProgress(0);
      setProgressMessage("");

      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);

        // Check for quota limit error
        const responseData = error.response.data || {};
        if (
          responseData.quota_info ||
          responseData.details?.toLowerCase().includes("quota")
        ) {
          const resetTime = responseData.quota_info?.reset_time_display;
          const quotaType = responseData.details?.includes("API")
            ? "api"
            : "spaces";

          // Show quota modal instead of alert
          setQuotaModalData({
            status: responseData.quota_info?.status || "unknown",
            resetTime: responseData.quota_info?.reset_time,
            type: quotaType,
          });
          onQuotaModalOpen();
          return;
        }

        const message =
          error.response.data?.error ||
          error.response.data?.message ||
          "Server error";
        alert(
          `❌ Generation Failed\n\n${message}\n\n` +
          `Please check:\n` +
          `• Backend server is running (port 3000)\n` +
          `• AI service is running (port 5001)\n` +
          `• Your photo was uploaded correctly`,
        );
      } else if (error.code === "ECONNABORTED") {
        alert(
          "⏱️ Request Timed Out\n\n" +
          "The generation took too long. This usually means:\n\n" +
          "• AI service is not running or very slow\n" +
          "• Image files are too large\n" +
          "• Server is overloaded\n\n" +
          "Solutions:\n" +
          "1. Make sure AI service (port 5001) is running\n" +
          "2. Try with a smaller image\n" +
          "3. Restart the backend and AI service",
        );
      } else if (error.request) {
        alert(
          "🔌 Cannot Connect to Server\n\n" +
          "Make sure:\n" +
          "1. Backend is running on port 3000\n" +
          "2. AI service is running on port 5001\n" +
          "3. No firewall blocking the connection",
        );
      } else {
        alert("❌ Try-on generation failed. Please try again.");
      }
    }
  };

  const renderProducts = (items) => {
    if (items.length === 0) {
      return (
        <div
          className="empty-state"
          style={{ textAlign: "center", gridColumn: "1 / -1", padding: "60px" }}
        >
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>💝</div>
          <h3
            style={{
              color: "#333",
              marginBottom: "12px",
              fontSize: "20px",
              fontWeight: "500",
            }}
          >
            Wishlist is Empty
          </h3>
          <p
            style={{
              color: "#757575",
              fontSize: "14px",
              lineHeight: "1.6",
              maxWidth: "400px",
              margin: "0 auto 24px",
            }}
          >
            Add items to your wishlist from the Collections page to try them on
            virtually.
          </p>
          <button
            style={{
              marginTop: "8px",
              padding: "14px 36px",
              background: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              fontWeight: "500",
              transition: "all 0.3s",
              boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
            }}
            onClick={() => navigate("/collections")}
            onMouseEnter={(e) =>
              (e.target.style.transform = "translateY(-2px)")
            }
            onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
          >
            Browse Collections
          </button>
        </div>
      );
    }

    return items.map((item) => {
      // Handle both direct products and wishlist items
      const product = item.productId || item.product || item;

      if (!product || !product._id) {
        console.log("⚠️ Invalid product item:", item);
        return null;
      }

      const productId = product._id || product.id;
      const productName = product.name || product.title || "Unnamed Product";
      const productImage = product.image;
      const productPrice = product.price || product.priceRange || "N/A";
      const isSelected =
        selectedProduct &&
        (selectedProduct._id || selectedProduct.id) === productId;

      // Create fallback SVG for missing images
      const fallbackImage = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400'%3E%3Crect width='300' height='400' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-size='16' text-anchor='middle' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E`;

      return (
        <div
          key={productId}
          className={`product-card ${isSelected ? "selected" : ""}`}
          onClick={() => handleProductSelect(product)}
          style={{ cursor: "pointer", position: "relative" }}
        >
          <div className="product-image-wrapper">
            <img
              src={productImage || fallbackImage}
              alt={productName}
              className="product-image"
              onError={(e) => {
                e.target.src = fallbackImage;
              }}
            />
            {activeTab === "wishlist" && (
              <div className="wishlist-badge">❤️</div>
            )}
          </div>
          <div className="product-info">
            <h3 className="product-name">{productName}</h3>
            <p className="product-price">{productPrice}</p>
          </div>
        </div>
      );
    });
  };

  // ✅ Generating overlay
  if (isGenerating) {
    return (
      <div className="generating-overlay">
        <div className="generating-content">
          <h2>Creating Your Try-On</h2>

          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            >
              {progress > 10 && <span>{progress}%</span>}
            </div>
          </div>

          <p className="progress-message">{progressMessage}</p>

          <div className="loading-animation">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="clothing-selector">
      <h2>Choose Your Outfit</h2>

      <div className="selector-tabs">
        <button
          className={activeTab === "wishlist" ? "tab-active" : ""}
          onClick={() => {
            setActiveTab("wishlist");
            setSelectedProduct(null);
            setUploadedClothing(null);
            loadWishlistFromStorage(); // Reload wishlist when tab is clicked
          }}
        >
          <span>💝</span> From Wishlist
          {wishlistItems.length > 0 && (
            <span className="tab-count">{wishlistItems.length}</span>
          )}
        </button>
        <button
          className={activeTab === "upload" ? "tab-active" : ""}
          onClick={() => {
            setActiveTab("upload");
            setSelectedProduct(null);
          }}
        >
          <span>📸</span> Upload Screenshot
        </button>
      </div>

      {activeTab === "wishlist" && (
        <div className="catalog-grid-container">
          {wishlistItems.length === 0 ? (
            renderProducts([]) // Show empty state
          ) : (
            <>
              {/* TOPS SECTION */}
              <div className="category-section">
                <h3 className="section-title">👕 Tops & Full Body</h3>
                <div className="catalog-grid">
                  {renderProducts(
                    wishlistItems.filter((item) => {
                      const product = item.productId || item.product || item;
                      return getCategoryType(product.category) === "upper_body";
                    }),
                  )}
                </div>
              </div>

              {/* BOTTOMS SECTION */}
              <div className="category-section" style={{ marginTop: "40px" }}>
                <h3 className="section-title">👖 Bottoms & Pants</h3>
                <div className="catalog-grid">
                  {renderProducts(
                    wishlistItems.filter((item) => {
                      const product = item.productId || item.product || item;
                      return getCategoryType(product.category) === "lower_body";
                    }),
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "upload" && (
        <div className="upload-screenshot">
          <input
            type="file"
            accept="image/*"
            onChange={handleClothingUpload}
            id="clothing-upload"
            style={{ display: "none" }}
          />
          <label htmlFor="clothing-upload" className="upload-label">
            {uploadedClothing ? (
              <div style={{ position: "relative" }}>
                <img
                  src={uploadedClothing.preview}
                  alt="Uploaded clothing"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "500px",
                    borderRadius: "12px",
                  }}
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setUploadedClothing(null);
                  }}
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    background: "rgba(255, 255, 255, 0.95)",
                    border: "none",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    cursor: "pointer",
                    fontSize: "18px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="upload-placeholder">
                <span>📸</span>
                <p>Click to upload clothing screenshot</p>
                <small
                  style={{
                    color: "#999",
                    fontSize: "13px",
                    marginTop: "12px",
                    display: "block",
                  }}
                >
                  Screenshots from fashion websites work great!
                </small>
              </div>
            )}
          </label>

          {/* ✅ Garment Type Selector for Uploads */}
          {uploadedClothing && (
            <div
              className="upload-category-selector"
              style={{ marginTop: "20px", textAlign: "center" }}
            >
              <p
                style={{
                  fontWeight: "500",
                  marginBottom: "10px",
                  color: "#444",
                }}
              >
                Is this a Top or Bottom?
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "20px",
                }}
              >
                <label>
                  <input
                    type="radio"
                    name="garmentType"
                    value="upper_body"
                    checked={uploadCategory === "upper_body"}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    style={{ marginRight: "8px" }}
                  />
                  👕 Top / Dress
                </label>
                <label>
                  <input
                    type="radio"
                    name="garmentType"
                    value="lower_body"
                    checked={uploadCategory === "lower_body"}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    style={{ marginRight: "8px" }}
                  />
                  👖 Pant / Skirt
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Display selected item if present */}
      {activeTab === "wishlist" && selectedProduct && (
        <div
          style={{
            marginTop: "24px",
            padding: "16px",
            background: "#f8f8f8",
            borderRadius: "8px",
            borderLeft: "4px solid #2a2a2a",
          }}
        >
          <p
            style={{
              fontWeight: "600",
              marginBottom: "12px",
              color: "#333",
              fontSize: "14px",
            }}
          >
            👕 Selected Item:
          </p>
          <span
            style={{
              background: "#2a2a2a",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "14px",
              display: "inline-block",
            }}
          >
            {selectedProduct.name || selectedProduct.title}
          </span>
        </div>
      )}

      <button
        className="btn-primary-studio generate-btn"
        onClick={generateTryOn}
        disabled={(!selectedProduct && !uploadedClothing) || isGenerating}
      >
        {isGenerating ? (
          <>
            <span className="spinner-small"></span> Generating...
          </>
        ) : (
          "✨ Generate Try-On"
        )}
      </button>

      {(selectedProduct || uploadedClothing) && (
        <div
          style={{
            textAlign: "center",
            marginTop: "20px",
            padding: "16px",
            background: "rgba(42, 42, 42, 0.05)",
            borderRadius: "8px",
            fontSize: "14px",
            color: "#555",
          }}
        >
          ✓{" "}
          {selectedProduct
            ? `Selected: ${selectedProduct.name || selectedProduct.title}`
            : `Screenshot uploaded: ${uploadedClothing.file.name}`}
        </div>
      )}

      {/* Debug Info (Shows in development mode) */}
      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            marginTop: "40px",
            padding: "20px",
            background: "#f0f0f0",
            borderRadius: "8px",
            fontSize: "12px",
            fontFamily: "monospace",
          }}
        ></div>
      )}

      {/* Quota Limit Modal */}
      <QuotaLimitModal
        isOpen={isQuotaModalOpen}
        onClose={onQuotaModalClose}
        quotaStatus={quotaModalData.status}
        resetTime={quotaModalData.resetTime}
        quotaType={quotaModalData.type}
      />
    </div>
  );
};

export default ClothingSelector;


