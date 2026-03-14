import React, {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
} from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaHome,
  FaShoppingBag,
  FaUser,
  FaCog,
  FaHeart,
  FaShoppingCart,
  FaTimes,
  FaRedo,
  FaCamera,
  FaTshirt,
} from "react-icons/fa";
import useWishlistStore from "../../store/wishlistStore";
import useAvatarStore from "../../store/avatarStore";
import RealisticAvatar from "./RealisticAvatar";

import {
  applyTextureToAvatar,
  resetAvatarTextures,
  getAllAppliedProducts as getTextureAppliedProducts,
  debugLogAvatarMeshes,
} from "../../utils/avatarTextureSystem";

import {
  applyOutfitToAvatar as applyColorToAvatar,
  resetAvatarToDefault as resetColorAvatar,
  getAllAppliedProducts as getColorAppliedProducts,
} from "../../utils/avatarOutfitSystem";

import "../styles/avatarcustomizer.css";
import { Link } from "react-router-dom";

const AvatarCustomizer = () => {
  const navigate = useNavigate();
  const { wishlist } = useWishlistStore();

  const {
    selectedGender: storeGender,
    getCustomizationForAvatar,
    resetCustomization,
  } = useAvatarStore();

  const [cart, setCart] = useState([]);
  const [showOutfitSidebar, setShowOutfitSidebar] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [currentOutfitTexture, setCurrentOutfitTexture] = useState(null);
  const [notification, setNotification] = useState(null);
  const [modelLoading, setModelLoading] = useState(true);

  const selectedGender = storeGender;

  // ✅ Load cart from localStorage on mount
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const cartKey = userId ? `trymi_cart_${userId}` : "trymi_cart";
    const storedCart = localStorage.getItem(cartKey);
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart));
      } catch (e) {
        console.error("Error parsing cart:", e);
      }
    }

    // ✅ Listen for cart updates from other components
    const handleCartUpdate = () => {
      const userId = localStorage.getItem("userId");
      const cartKey = userId ? `trymi_cart_${userId}` : "trymi_cart";
      const updatedCart = localStorage.getItem(cartKey);
      if (updatedCart) {
        try {
          setCart(JSON.parse(updatedCart));
        } catch (e) {
          console.error("Error parsing cart:", e);
        }
      }
    };

    window.addEventListener("cart-updated", handleCartUpdate);
    return () => window.removeEventListener("cart-updated", handleCartUpdate);
  }, []);

  // ✅ Listen for avatar changes
  useEffect(() => {
    const handleAvatarChange = () => {
      showNotification(`✨ Avatar switched to ${storeGender}`);
    };

    window.addEventListener("avatar-changed", handleAvatarChange);

    return () => {
      window.removeEventListener("avatar-changed", handleAvatarChange);
    };
  }, [storeGender]);

  // Handle avatar loaded callback
  useEffect(() => {
    window.onAvatarLoaded = () => {
      setTimeout(() => setModelLoading(false), 800);
    };
    return () => {
      window.onAvatarLoaded = null;
    };
  }, []);

  const showNotification = (message, type = "success") => {
    if (typeof message === "string") {
      setNotification({ message, type });
    } else if (typeof message === "object" && message !== null) {
      setNotification({
        message: message.message || JSON.stringify(message),
        type: message.type || type,
      });
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOutfitSelect = (item) => {
    setSelectedOutfit(item);
  };

  const handleApplyOutfit = async (item) => {
    const avatarRef = window.avatarRef;

    if (!avatarRef || !avatarRef.current) {
      showNotification("⚠️ Please wait for avatar to load", "error");
      return;
    }

    const product = {
      id: item._id,
      _id: item._id,
      name: item.title || item.name,
      category: item.category,
      image: item.image,
      imageUrl: item.image,
      description: item.description,
      price: item.price,
    };

    const textureSuccess = await applyTextureToAvatar(product, avatarRef);

    if (textureSuccess) {
      setTimeout(() => {
        applyColorToAvatar(product, avatarRef);
      }, 300);

      setCurrentOutfitTexture({
        imageUrl: item.image,
        category: item.category,
        name: item.title || item.name,
        mode: "hybrid",
      });

      showNotification(`✨ ${item.title || item.name} applied!`, "success");
      setTimeout(() => setShowOutfitSidebar(false), 500);
    } else {
      const colorSuccess = applyColorToAvatar(product, avatarRef);
      if (colorSuccess) {
        setCurrentOutfitTexture({
          imageUrl: item.image,
          category: item.category,
          name: item.title || item.name,
          mode: "color",
        });
        showNotification(`✓ ${item.title || item.name} applied!`, "info");
        setTimeout(() => setShowOutfitSidebar(false), 500);
      } else {
        showNotification("❌ Failed to apply outfit", "error");
      }
    }
  };

  const handleResetAvatar = () => {
    const avatarRef = window.avatarRef;

    if (!avatarRef || !avatarRef.current) {
      showNotification("⚠️ Avatar not loaded", "error");
      return;
    }

    resetAvatarTextures(avatarRef);
    resetColorAvatar(avatarRef);
    setCurrentOutfitTexture(null);
    setSelectedOutfit(null);
    resetCustomization();
    showNotification("🔄 Avatar reset to default", "success");
  };

  const handleTakeScreenshot = () => {
    try {
      const canvas = document.querySelector("canvas");
      if (!canvas) {
        showNotification("❌ Canvas not found", "error");
        return;
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            showNotification("❌ Failed to capture screenshot", "error");
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          const timestamp = new Date()
            .toISOString()
            .slice(0, 19)
            .replace(/:/g, "-");
          link.download = `trymi-avatar-${timestamp}.png`;
          link.href = url;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 100);
          showNotification("📸 Screenshot saved!", "success");
        },
        "image/png",
        1.0,
      );
    } catch (error) {
      console.error("Screenshot error:", error);
      showNotification("❌ Screenshot failed", "error");
    }
  };

  const handleAddAllToCart = () => {
    try {
      const textureItems = getTextureAppliedProducts();
      const colorItems = getColorAppliedProducts();

      const allItems = [...textureItems];
      colorItems.forEach((item) => {
        if (
          !allItems.find(
            (existing) => existing._id === item._id || existing.id === item.id,
          )
        ) {
          allItems.push(item);
        }
      });

      if (allItems.length === 0) {
        showNotification("❌ No items applied to avatar", "error");
        return;
      }

      const userId = localStorage.getItem("userId");
      const cartKey = userId ? `trymi_cart_${userId}` : "trymi_cart";
      const storedCart = localStorage.getItem(cartKey);
      let cart = storedCart ? JSON.parse(storedCart) : [];

      allItems.forEach((item) => {
        const existing = cart.find(
          (ci) =>
            ci.id === item.id || ci._id === item.id || ci._id === item._id,
        );
        if (existing) {
          existing.quantity = (existing.quantity || 1) + 1;
        } else {
          cart.push({
            ...item,
            quantity: 1,
            _id: item._id || item.id,
            id: item.id || item._id,
          });
        }
      });

      localStorage.setItem(cartKey, JSON.stringify(cart));
      window.dispatchEvent(new Event("cart-updated"));
      setCart(cart);

      showNotification(
        `✅ Added ${allItems.length} item${allItems.length > 1 ? "s" : ""} to cart`,
        "success",
      );
    } catch (e) {
      console.error("Add to cart error:", e);
      showNotification("❌ Failed to add to cart", "error");
    }
  };

  const handleDebugAvatar = () => {
    const avatarRef = window.avatarRef;
    if (avatarRef && avatarRef.current) {
      debugLogAvatarMeshes(avatarRef);
      showNotification("🔍 Check console for debug info", "info");
    } else {
      showNotification("⚠️ Avatar not loaded", "error");
    }
  };

  const toggleOutfitSidebar = () => {
    setShowOutfitSidebar(!showOutfitSidebar);
  };

  // Styles moved to avatarcustomizer.css

  return (
    <div className="customizer-container">
      {/* styles tag removed as it is handled in CSS */}
      {/* globalStyles removed as it is handled in App.jsx */}

      {/* ✅ Avatar Loading Overlay */}
      {modelLoading && (
        <div className="avatar-loading-overlay">
          <div className="avatar-loader"></div>
          <h2 className="loading-title">PLEASE WAIT</h2>
          <p className="loading-subtitle">Your 3D Avatar is being prepared...</p>
        </div>
      )}

      {/* ✅ 3D Disclaimer */}
      <style>{`
        @media (max-width: 768px) {
          .hide-on-mobile {
            display: none !important;
          }
        }
      `}</style>
      <div className={`customizer-disclaimer ${showOutfitSidebar ? 'hide-on-mobile' : ''}`}>
        <h4 style={{ color: "#ff9800", margin: "0 0 5px 0", fontSize: "14px" }}>
          ⚠️ Open Source Limitations
        </h4>
        <p style={{ fontSize: "12px", margin: 0, lineHeight: "1.4" }}>
          This is a free open-source avatar. The geometry and body shape will{" "}
          <b>not change</b> based on the selected cloth. It only applies the
          dominating color/texture of the product.
        </p>
      </div>

      {/* ✅ Notification */}
      {notification && (
        <div className={`customizer-notification ${notification.type || ''}`}>
          <span style={{ fontSize: "18px" }}>
            {notification.type === "error"
              ? "❌"
              : notification.type === "info"
                ? "ℹ️"
                : "✅"}
          </span>
          {notification.message}
        </div>
      )}

      {/* ✅ Sidebar Overlay */}
      {showOutfitSidebar && (
        <div
          className="customizer-overlay"
          onClick={() => setShowOutfitSidebar(false)}
        />
      )}

      {/* ✅ OUTFIT SIDEBAR */}
      <div className={`customizer-sidebar ${showOutfitSidebar ? 'active' : ''}`}
        style={{ transform: showOutfitSidebar ? "translateX(0)" : "translateX(100%)" }}>
        <div className="customizer-sidebar-header">
          <div>
            <h2 className="customizer-sidebar-title">Choose Your Outfit</h2>
            <p style={{ fontSize: "12px", color: "#666666", marginTop: "5px" }}>
              {wishlist.length} items in wishlist
            </p>
          </div>
          <button
            className="customizer-close-btn"
            onClick={() => setShowOutfitSidebar(false)}
          >
            <FaTimes />
          </button>
        </div>

        <div className="customizer-sidebar-content">
          {wishlist.length === 0 ? (
            <div className="customizer-empty-state">
              <FaHeart className="customizer-empty-icon" />
              <h3 className="customizer-empty-title">No Outfits in Wishlist</h3>
              <p className="customizer-empty-text">
                Add items from collections to try them on!
              </p>
            </div>
          ) : (
            <div className="outfit-grid">
              {wishlist.map((item) => (
                <div
                  key={item._id}
                  className={`outfit-card ${selectedOutfit?._id === item._id ? 'selected' : ''}`}
                  onClick={() => handleOutfitSelect(item)}
                >
                  <img
                    src={item.image}
                    alt={item.title || item.name}
                    className="outfit-image"
                  />
                  <div className="outfit-info">
                    <div>
                      {item.category && (
                        <span className="category-badge">
                          {item.category}
                        </span>
                      )}
                      <h3 className="outfit-title">
                        {item.title || item.name}
                      </h3>
                      <p className="outfit-description">
                        {item.description && item.description.length > 60
                          ? item.description.substring(0, 60) + "..."
                          : item.description || "No description"}
                      </p>
                    </div>
                    <div>
                      <p className="outfit-price">
                        {item.price ? `₹${item.price}` : "Price unavailable"}
                      </p>
                      {selectedOutfit?._id === item._id && (
                        <button
                          className="apply-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyOutfit(item);
                          }}
                        >
                          Apply to Avatar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ✅ NAVBAR */}
      <nav className="customizer-navbar">
        <div className="customizer-nav-left">
          <button
            className="customizer-back-btn"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft /> Back
          </button>
          <h1 className="customizer-logo">TRYMI</h1>
          <span className="customizer-page-title customizer-title-text">Virtual Try-On Studio</span>
        </div>

        {/* Navigation links - horizontal scrollable on mobile */}
        <div className="customizer-nav-links">
          <Link to="/outfit-predictor" className="customizer-nav-link">Home</Link>
          <Link to="/collections" className="customizer-nav-link">Collections</Link>
          <Link to="/virtual-try-on" className="customizer-nav-link active">Virtual Try-On</Link>
          <Link to="/studio" className="customizer-nav-link">Studio</Link>
        </div>

        <div className="customizer-nav-right">
          <button
            className="customizer-icon-btn"
            onClick={() => navigate("/wishlist")}
          >
            <FaHeart
              style={{ color: wishlist.length > 0 ? "#FF4444" : "#1a1a1a" }}
            />
            {wishlist.length > 0 && (
              <span className="customizer-badge">{wishlist.length}</span>
            )}
          </button>

          <button
            className="customizer-icon-btn"
            onClick={() => navigate("/cart")}
          >
            <FaShoppingCart
              style={{ color: cart.length > 0 ? "#1a73e8" : "#1a1a1a" }}
            />
            {cart.length > 0 && (
              <span className="customizer-badge" style={{ backgroundColor: "#1a73e8" }}>
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* ✅ 3D CANVAS */}
      <div className="customizer-canvas-wrapper">
        <Canvas frameloop="always">
          <PerspectiveCamera makeDefault position={[0, 1.5, 3]} />
          <OrbitControls
            enableZoom={true}
            enablePan={true}
            minDistance={2}
            maxDistance={8}
            target={[0, 1, 0]}
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <spotLight position={[-5, 5, 5]} intensity={0.5} />
          <Suspense fallback={null}>
            <RealisticAvatar
              gender={selectedGender}
              outfitTexture={currentOutfitTexture}
              customization={getCustomizationForAvatar()}
            />
            <Environment preset="studio" />
          </Suspense>
        </Canvas>
      </div>

      {/* ✅ CONTROLS PANEL */}
      <div className="customizer-controls-panel">
        {/* ✅ Avatar Selection Button */}
        <button
          className="customizer-btn customizer-btn-avatar"
          onClick={() => navigate("/avatar-selection")}
        >
          <FaUser /> <span>Avatar Selection</span>
        </button>

        {/* ✅ Change Outfit */}
        <button
          className="customizer-btn"
          onClick={toggleOutfitSidebar}
        >
          <FaTshirt /> <span>Change Outfit</span>
        </button>

        {/* ✅ Screenshot */}
        <button
          className="customizer-btn"
          onClick={handleTakeScreenshot}
        >
          <FaCamera /> <span>Screenshot</span>
        </button>

        {/* ✅ Add to Cart */}
        <button
          className="customizer-btn customizer-btn-cart"
          style={{ backgroundColor: "#1a73e8" }}
          onClick={handleAddAllToCart}
        >
          <FaShoppingCart /> <span>Add to Cart</span>
        </button>
      </div>
    </div>
  );
};

export default AvatarCustomizer;


