import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaBirthdayCake,
  FaVenusMars,
  FaPencilAlt,
  FaSave,
  FaTimes,
  FaShoppingBag,
  FaHeart,
  FaArrowLeft,
  FaStar,
  FaTshirt,
  FaCommentDots,
  FaTrash,
  FaCamera,
  FaInfoCircle,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import "../styles/userprofile.css";
import axios from "axios";
import AtelierLoader from "@core/AtelierLoader.jsx";

const UserProfile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  // Data States
  const [cartItems, setCartItems] = useState([]);
  const [myLooks, setMyLooks] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(0);

  // Form States
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    age: "",
    profileImage: "",
  });

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState("general");
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const API_URL = "http://localhost:3000";

  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  }, []);

  // ============================================
  // ✅ DATA FETCHING
  // ============================================
  const fetchMyLooks = useCallback(async (userId) => {
    try {
      const looksRes = await axios.get(
        `${API_URL}/api/studio/my-looks/${userId}`,
      );
      if (looksRes.data && looksRes.data.looks) {
        setMyLooks(looksRes.data.looks);
      }
    } catch (e) {
      console.warn("My Looks fetch failed", e);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        navigate("/login");
        return;
      }

      const userData = JSON.parse(storedUser);
      // ✅ FIX: Use user ID if available, otherwise email
      const userId = userData._id || userData.id || userData.email;

      // 1. Fetch Profile info from API
      try {
        const profileRes = await axios.get(`${API_URL}/api/profile/${userId}`);
        if (profileRes.data.success) {
          setProfile(profileRes.data.profile);
          setFormData({
            name: profileRes.data.profile.name || "",
            gender: profileRes.data.profile.gender || "",
            age: profileRes.data.profile.age || "",
            profileImage: profileRes.data.profile.profileImage || "",
          });
        }
      } catch (err) {
        console.warn("Profile fetch failed, using local data", err);
        setProfile(userData);
        setFormData({
          name: userData.name || "",
          gender: userData.gender || "",
          age: userData.age || "",
          profileImage: userData.profileImage || "",
        });
      }

      // 2. Load Cart
      const cartKey = userId ? `trymi_cart_${userId}` : "trymi_cart";
      const storedCart = localStorage.getItem(cartKey);
      if (storedCart) {
        try {
          const parsedCart = JSON.parse(storedCart);
          if (Array.isArray(parsedCart)) setCartItems(parsedCart);
        } catch (e) {
          console.error("Cart parse error", e);
        }
      }

      // 3. Fetch My Looks
      await fetchMyLooks(userId);

      // 4. Fetch Wishlist Count
      try {
        const wishRes = await axios.get(`${API_URL}/api/wishlist/${userId}`);
        if (wishRes.data && wishRes.data.count !== undefined) {
          setWishlistCount(wishRes.data.count);
        }
      } catch (e) {
        console.warn("Wishlist count fail", e);
      }
    } catch (err) {
      console.error("❌ Critical error loading profile:", err);
      showToast("Connection issue. Showing partial data.", "error");
    } finally {
      setLoading(false);
    }
  }, [navigate, fetchMyLooks, showToast]);

  useEffect(() => {
    loadInitialData();

    // Support deep-linking via navigation state (e.g., from "Drop Feedback" buttons)
    const locationState = window.history.state?.usr;
    if (locationState?.activeTab) {
      setActiveTab(locationState.activeTab);
    }
  }, [loadInitialData]);

  // ============================================
  // ✅ ACTIONS
  // ============================================

  const handleSaveProfile = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const userId = user._id || user.id || user.email;

      const response = await axios.put(
        `${API_URL}/api/profile/${userId}`,
        formData,
      );
      if (response.data.success) {
        setProfile({ ...profile, ...formData });

        // Update localStorage to keep sync
        const updatedUser = { ...user, ...formData };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        setEditMode(false);
        showToast("Settings updated successfully! ✨");
      }
    } catch (err) {
      console.error("Profile save error", err);
      showToast("Failed to update profile", "error");
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) {
      showToast("Please enter a message or suggestion", "error");
      return;
    }

    try {
      setFeedbackLoading(true);
      const user = JSON.parse(localStorage.getItem("user"));
      const userId = user._id || user.id || user.email;

      await axios.post(`${API_URL}/api/feedback`, {
        userId,
        userName: user.name || "User",
        email: user.email,
        message: feedbackMessage,
        rating: feedbackRating,
        category: feedbackCategory,
      });

      showToast("Thank you for your feedback! 💖");
      setFeedbackMessage("");
      setFeedbackRating(5);
      setFeedbackCategory("general");
    } catch (err) {
      console.error("Feedback error", err);
      showToast("Could not send feedback. Try again later.", "error");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleDeleteLook = async (lookId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this generated look permanently?")) return;

    try {
      const res = await axios.delete(
        `${API_URL}/api/studio/delete-look/${lookId}`,
      );
      if (res.data.success) {
        setMyLooks((prev) => prev.filter((l) => l._id !== lookId));
        showToast("Look removed from your collection");
      }
    } catch (err) {
      showToast("Failed to delete look", "error");
    }
  };

  // ============================================
  // ✅ RENDERERS
  // ============================================

  if (loading) {
    return <AtelierLoader />;
  }

  return (
    <div className="profile-page">
      {toast.show && (
        <div
          className={`toast ${toast.type === "success" ? "toast-success" : toast.type === "error" ? "toast-error" : "toast-info"}`}
        >
          {toast.type === "success" && (
            <FaCheckCircle style={{ marginRight: "8px" }} />
          )}
          {toast.type === "error" && (
            <FaExclamationCircle style={{ marginRight: "8px" }} />
          )}
          {toast.type === "info" && (
            <FaInfoCircle style={{ marginRight: "8px" }} />
          )}
          {toast.message}
        </div>
      )}

      <div className="profile-header">
        <button
          className="back-btn"
          onClick={() => navigate("/outfit-predictor")}
        >
          <FaArrowLeft /> Exit to Dashboard
        </button>
        <div className="header-user-info">
          <h1>{profile?.name || "My Account"}</h1>
          <span className="user-email-subtitle">{profile?.email}</span>
        </div>
      </div>

      <div className="profile-container">
        {/* Navigation Tabs */}
        <div className="profile-sidebar">
          <div className="sidebar-header">
            <div className="user-avatar-large">
              {profile?.profileImage ? (
                <img src={profile.profileImage} alt="Profile" />
              ) : (
                <FaUser />
              )}
            </div>
            <h3>Explore Your Space</h3>
          </div>

          <div className="profile-tabs">
            <button
              className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <FaUser /> Profile Details
            </button>
            <button
              className={`tab-btn ${activeTab === "cart" ? "active" : ""}`}
              onClick={() => setActiveTab("cart")}
            >
              <FaShoppingBag /> My Shopping Cart ({cartItems.length})
            </button>
            {/* <button
              className={`tab-btn ${activeTab === "looks" ? "active" : ""}`}
              onClick={() => setActiveTab("looks")}
            >
              <FaTshirt /> Generated Looks ({myLooks.length})
            </button> */}
            <button
              className={`tab-btn ${activeTab === "feedback" ? "active" : ""}`}
              onClick={() => setActiveTab("feedback")}
            >
              <FaCommentDots /> Give Feedback
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="tab-pane fade-in">
              <div className="stats-overview">
                <div className="stat-card">
                  <div className="stat-icon-wrapper cyan">
                    <FaShoppingBag />
                  </div>
                  <div className="stat-info">
                    <div className="count">{cartItems.length}</div>
                    <div className="label">In Cart</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper rose">
                    <FaHeart />
                  </div>
                  <div className="stat-info">
                    <div className="count">{wishlistCount}</div>
                    <div className="label">Wishlist</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-wrapper amber">
                    <FaCamera />
                  </div>
                  <div className="stat-info">
                    <div className="count">{myLooks.length}</div>
                    <div className="label">AI Creation</div>
                  </div>
                </div>
              </div>

              <div className="profile-card">
                <div className="profile-card-header">
                  <h2>
                    <FaInfoCircle /> Personal Details
                  </h2>
                  <button
                    className={`edit-toggle-btn ${editMode ? "active" : ""}`}
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? (
                      <>
                        <FaTimes /> Close
                      </>
                    ) : (
                      <>
                        <FaPencilAlt /> Update Profile
                      </>
                    )}
                  </button>
                </div>

                {editMode ? (
                  <div className="profile-form animated">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Display Name</label>
                        <input
                          type="text"
                          placeholder="Your full name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Preferred Gender</label>
                        <select
                          value={formData.gender}
                          onChange={(e) =>
                            setFormData({ ...formData, gender: e.target.value })
                          }
                        >
                          <option value="">Choose gender...</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Non-binary / Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Age</label>
                        <input
                          type="number"
                          placeholder="Years"
                          value={formData.age}
                          onChange={(e) =>
                            setFormData({ ...formData, age: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Avatar URL (Image Link)</label>
                        <input
                          type="text"
                          placeholder="https://image-link.com/avatar.jpg"
                          value={formData.profileImage}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              profileImage: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button
                        className="save-btn glass"
                        onClick={handleSaveProfile}
                      >
                        <FaSave /> Apply Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="info-display-grid">
                    <div className="info-field">
                      <span className="field-label">
                        <FaUser /> Name
                      </span>
                      <span className="field-value">
                        {profile?.name || "Guest User"}
                      </span>
                    </div>
                    <div className="info-field">
                      <span className="field-label">
                        <FaEnvelope /> Verified Email
                      </span>
                      <span className="field-value">{profile?.email}</span>
                    </div>
                    <div className="info-field">
                      <span className="field-label">
                        <FaVenusMars /> Gender
                      </span>
                      <span
                        className="field-value"
                        style={{ textTransform: "capitalize" }}
                      >
                        {profile?.gender || "Not specified"}
                      </span>
                    </div>
                    <div className="info-field">
                      <span className="field-label">
                        <FaBirthdayCake /> Current Age
                      </span>
                      <span className="field-value">
                        {profile?.age ? `${profile.age} Years` : "Not provided"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CART TAB */}
          {activeTab === "cart" && (
            <div className="tab-pane fade-in">
              <div className="section-title">
                <h2>🛒 Your Shopping Collection</h2>
                <p>Managing {cartItems.length} items from your last session</p>
              </div>

              {cartItems.length === 0 ? (
                <div className="empty-state-card">
                  <div className="empty-icon-pulse">🛒</div>
                  <h3>Your shopping bag is empty</h3>
                  <p>
                    Check out our latest arrivals and add something you love!
                  </p>
                  <button
                    className="cta-btn-primary"
                    onClick={() => navigate("/collections")}
                  >
                    Browse Collections
                  </button>
                </div>
              ) : (
                <div className="cart-list-grid">
                  {cartItems.map((item, idx) => (
                    <div className="cart-item-modern" key={idx}>
                      <div className="item-img-container">
                        <img
                          src={item.image || "https://via.placeholder.com/200"}
                          alt={item.name}
                        />
                      </div>
                      <div className="item-info-main">
                        <h4>{item.name}</h4>
                        <div className="item-price-tag">₹{item.price}</div>
                        <div className="item-qty-badge">
                          Quantity: {item.quantity || 1}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MY LOOKS TAB */}
          {activeTab === "looks" && (
            <div className="tab-pane fade-in">
              <div className="section-title">
                <h2>🎨 AI Studio: Your Creations</h2>
                <p>Showing your {myLooks.length} most recent virtual try-ons</p>
              </div>

              {myLooks.length === 0 ? (
                <div className="empty-state-card">
                  <div className="empty-icon-pulse">🎨</div>
                  <h3>No generated looks yet</h3>
                  <p>
                    Upload a photo in the Studio to see the AI magic happen!
                  </p>
                  <button
                    className="cta-btn-primary"
                    onClick={() => navigate("/studio")}
                  >
                    Visit AI Studio
                  </button>
                </div>
              ) : (
                <div className="looks-gallery">
                  {myLooks.map((look) => (
                    <div
                      className="modern-look-card"
                      key={look._id}
                      onClick={() =>
                        navigate("/studio/result", {
                          state: { resultId: look._id },
                        })
                      }
                    >
                      <div className="look-image-host">
                        <img
                          src={
                            look.resultImageUrl.startsWith("http")
                              ? look.resultImageUrl
                              : `http://localhost:3000${look.resultImageUrl}`
                          }
                          alt="AI Result"
                          onError={(e) => {
                            e.target.src =
                              "https://via.placeholder.com/300?text=Image+Expired";
                          }}
                        />
                        <div className="look-hover-overlay">
                          <button className="look-view-btn">
                            View Details
                          </button>
                        </div>
                      </div>
                      <div className="look-card-footer">
                        <div className="look-meta-text">
                          <span className="look-item-name">
                            {look.productId?.name || "Custom Outfit"}
                          </span>
                          <span className="look-item-date">
                            {new Date(look.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          className="delete-look-btn"
                          title="Delete Look"
                          onClick={(e) => handleDeleteLook(look._id, e)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FEEDBACK TAB */}
          {activeTab === "feedback" && (
            <div className="tab-pane fade-in">
              <div className="feedback-container-modern">
                <div className="feedback-intro">
                  <h2>📣 Share Your Experience</h2>
                  <p>
                    Your suggestions help us build a better TRYMI for everyone.
                    We read every message.
                  </p>
                </div>

                <div className="feedback-card-inner">
                  <div className="feedback-form-sections">
                    <div className="feedback-left-column">
                      <div className="rating-selector-group">
                        <label className="field-label">
                          Overall Experience
                        </label>
                        <div className="modern-star-rating">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              className={`star-button ${star <= feedbackRating ? "gold" : ""}`}
                              onClick={() => setFeedbackRating(star)}
                            >
                              <FaStar />
                            </button>
                          ))}
                        </div>
                        <span className="rating-desc">
                          {feedbackRating === 5 && "Excellent"}
                          {feedbackRating === 4 && "Great"}
                          {feedbackRating === 3 && "Average"}
                          {feedbackRating === 2 && "Poor"}
                          {feedbackRating === 1 && "Very Poor"}
                        </span>
                      </div>

                      <div className="category-selector">
                        <label>Feedback Category</label>
                        <div className="category-chips">
                          {[
                            "general",
                            "bug",
                            "feature",
                            "complaint",
                            "praise",
                          ].map((cat) => (
                            <button
                              key={cat}
                              className={`chip ${feedbackCategory === cat ? "selected" : ""}`}
                              onClick={() => setFeedbackCategory(cat)}
                            >
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="feedback-right-column">
                      <div className="message-area-group">
                        <label>Your Message</label>
                        <textarea
                          placeholder="Describe your bug, suggest a feature, or just say hi..."
                          value={feedbackMessage}
                          onChange={(e) => setFeedbackMessage(e.target.value)}
                        />
                      </div>

                      <button
                        className={`submit-feedback-btn ${feedbackLoading ? "loading" : ""}`}
                        onClick={handleSubmitFeedback}
                        disabled={feedbackLoading}
                      >
                        {feedbackLoading ? (
                          "Processing..."
                        ) : (
                          <>
                            <FaCommentDots /> Send My Feedback
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
