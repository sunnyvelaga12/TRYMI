import React from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaShoppingCart,
  FaTrash,
  FaHeart,
  FaTshirt,
  FaFire,
} from "react-icons/fa";
import useWishlistStore from "../../store/wishlistStore";
import AtelierLoader from "@core/AtelierLoader.jsx";
import "./Wishlist.css";

const Wishlist = () => {
  const navigate = useNavigate();
  const [notification, setNotification] = React.useState(null);

  const { wishlist, removeFromWishlist, clearWishlist, fetchUserWishlist } =
    useWishlistStore();

  const [isLoading, setIsLoading] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const startTime = Date.now();
      try {
        await fetchUserWishlist();
      } catch (error) {
        console.error("Error fetching wishlist:", error);
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 800 - elapsed);
        setTimeout(() => {
          setIsLoading(false);
          requestAnimationFrame(() => setMounted(true));
        }, remaining);
      }
    };
    load();
  }, [fetchUserWishlist]);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRemoveFromWishlist = (itemId) => {
    const item = wishlist.find((w) => w._id === itemId);
    removeFromWishlist(itemId);
    showNotification(
      `${item?.title || item?.name || "Item"} removed from wishlist`,
      "info",
    );
  };

  const addToCart = (item) => {
    try {
      const userId = localStorage.getItem("userId");
      const cartKey = userId ? `trymi_cart_${userId}` : "trymi_cart";
      const storedCart = localStorage.getItem(cartKey);
      let cart = storedCart ? JSON.parse(storedCart) : [];
      const existingItem = cart.find((cartItem) => cartItem._id === item._id);
      if (existingItem) {
        cart = cart.map((cartItem) =>
          cartItem._id === item._id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
        showNotification(`Increased ${item.title || item.name} quantity in cart!`, "success");
      } else {
        cart = [...cart, { ...item, quantity: 1 }];
        showNotification(`${item.title || item.name} added to cart!`, "success");
      }
      localStorage.setItem(cartKey, JSON.stringify(cart));
      window.dispatchEvent(new Event("cart-updated"));
    } catch (e) {
      console.error("Error adding to cart:", e);
      showNotification("Failed to add to cart", "error");
    }
  };

  const addAllToCart = () => {
    let addedCount = 0;
    const userId = localStorage.getItem("userId");
    const cartKey = userId ? `trymi_cart_${userId}` : "trymi_cart";
    wishlist.forEach((item) => {
      try {
        const storedCart = localStorage.getItem(cartKey);
        let cart = storedCart ? JSON.parse(storedCart) : [];
        const existingItem = cart.find((cartItem) => cartItem._id === item._id);
        if (existingItem) {
          cart = cart.map((cartItem) =>
            cartItem._id === item._id
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem,
          );
        } else {
          cart = [...cart, { ...item, quantity: 1 }];
        }
        localStorage.setItem(cartKey, JSON.stringify(cart));
        addedCount++;
      } catch (e) {
        console.error("Error adding item to cart:", e);
      }
    });
    if (addedCount > 0) {
      showNotification(`Added ${addedCount} items to cart!`, "success");
      window.dispatchEvent(new Event("cart-updated"));
    }
  };

  const handleClearWishlist = () => {
    if (window.confirm("Are you sure you want to clear your entire wishlist?")) {
      clearWishlist();
      showNotification("Wishlist cleared", "info");
    }
  };

  const handleVirtualTryClick = () => {
    try {
      navigate("/virtual-try-on");
    } catch (error) {
      window.location.href = "/virtual-try-on";
    }
  };

  return (
    <>
      {/* Premium Loading Overlay */}
      {isLoading && <AtelierLoader />}

      <div className={`wishlist-container ${mounted ? "wishlist-mounted" : "wishlist-hidden"}`}>
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes bounce {
            0% { transform: translateY(0) scale(1); }
            100% { transform: translateY(-4px) scale(1.1); }
          }
        `}</style>

        {/* Notification */}
        {notification && (
          <div className={`wishlist-notification wishlist-notification--${notification.type}`}>
            {notification.type === "success" && "✓"}
            {notification.type === "error" && "✕"}
            {notification.type === "info" && "ℹ"}
            <span>{notification.message}</span>
          </div>
        )
        }

        {/* Header */}
        <div className="wishlist-header">
          <div className="wishlist-header-left">
            <h1 className="wishlist-title">My Wishlist ({wishlist.length})</h1>
          </div>

          <div className="wishlist-header-actions">
            {wishlist.length > 0 && (
              <>
                <button className="wish-header-btn wishlist-add-all-btn" onClick={addAllToCart}>
                  <FaShoppingCart /> Add All to Cart
                </button>
                <button className="wish-header-btn wishlist-clear-btn" onClick={handleClearWishlist}>
                  <FaTrash /> Clear Wishlist
                </button>
              </>
            )}
            <button className="wish-header-btn wishlist-virtual-try-btn" onClick={handleVirtualTryClick}>
              <FaTshirt /> Virtual Try-On
            </button>
            <button className="wish-header-btn wishlist-studio-btn" onClick={() => navigate("/studio")}>
              <FaTshirt /> Studio
              <span className="wishlist-fire-icon"><FaFire /></span>
            </button>
            <button className="wish-header-btn wishlist-back-btn" onClick={() => navigate("/collections")}>
              <FaArrowLeft /> Back to Collections
            </button>
          </div>
        </div>
        {/* Empty State */}
        {
          wishlist.length === 0 ? (
            <div className="wishlist-empty-state">
              <FaHeart style={{ fontSize: "80px", color: "#E8E8E8", display: "block", margin: "0 auto 30px" }} />
              <h2 className="wishlist-empty-title">Your Wishlist is Empty</h2>
              <p className="wishlist-empty-text">
                Start adding products you love to your wishlist!
              </p>
              <Link to="/collections" style={{ textDecoration: "none" }}>
                <button className="wish-header-btn wishlist-back-btn">
                  Browse Collections
                </button>
              </Link>
            </div>
          ) : (
            <div className="wishlist-grid">
              {wishlist.map((item) => (
                <div key={item._id} className="wishlist-card">
                  <div className="wishlist-image-container">
                    <img
                      src={item.image}
                      alt={item.title || item.name}
                      className="wishlist-image"
                    />
                    <div className="wishlist-heart-icon">
                      <FaHeart style={{ fontSize: "20px", color: "#FF4444" }} />
                    </div>
                  </div>
                  <div className="wishlist-card-content">
                    <h3 className="wishlist-item-title">{item.title || item.name}</h3>
                    <p className="wishlist-item-desc">
                      {item.description && item.description.length > 100
                        ? item.description.substring(0, 100) + "..."
                        : item.description}
                    </p>
                    <p className="wishlist-item-price">
                      {item.priceRange || (item.price ? `₹${item.price}` : "Price not available")}
                    </p>
                    <div className="wishlist-card-actions">
                      <button
                        className="wishlist-card-btn wishlist-add-to-cart"
                        onClick={() => addToCart(item)}
                      >
                        <FaShoppingCart /> Cart
                      </button>
                      <button
                        className="wishlist-card-btn wishlist-remove-item"
                        onClick={() => handleRemoveFromWishlist(item._id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }

        {/* Mobile Sticky Bar */}
        <div className="wishlist-mobile-sticky-bar">
          <div className="wishlist-mobile-sticky-info">
            <span className="mobile-item-count">{wishlist.length} ITEMS</span>
          </div>
          <div className="wishlist-mobile-sticky-actions">
            {wishlist.length > 0 && (
              <>
                <button className="mobile-action-btn mobile-clear-btn" onClick={handleClearWishlist}>
                  CLEAR
                </button>
                <button className="mobile-action-btn mobile-add-all-btn" onClick={addAllToCart}>
                  ADD ALL TO CART
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Wishlist;


