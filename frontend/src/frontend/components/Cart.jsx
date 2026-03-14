import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTrash,
  FaMinus,
  FaPlus,
  FaShoppingBag,
  FaArrowLeft,
} from "react-icons/fa";
import "../styles/Cart.css";

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const navigate = useNavigate();

  // ✅ Helper to get user-specific cart key
  const getCartKey = () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.warn("⚠️ No userId found, using global cart key");
      return "trymi_cart";
    }
    return `trymi_cart_${userId}`;
  };

  // Helper to get unique ID from item (handles both id and _id)
  const getItemId = (item) => item?.id || item?._id;

  useEffect(() => {
    console.log("✅ Cart component rendered!");
    loadCart();
  }, []);

  const loadCart = useCallback(() => {
    try {
      const cartKey = getCartKey();
      const stored = localStorage.getItem(cartKey);
      console.log(`📍 Loading cart from key: ${cartKey}`);

      if (stored) {
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) {
          console.warn("⚠️ Invalid cart format, resetting");
          localStorage.removeItem(cartKey);
          setCartItems([]);
          return;
        }
        const validItems = parsed.filter(
          (item) => item && (item.id || item._id),
        );
        setCartItems(validItems);
        console.log("📦 Cart loaded:", validItems.length, "items");
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error("❌ Error loading cart:", error);
      const cartKey = getCartKey();
      localStorage.removeItem(cartKey);
      setCartItems([]);
    }
  }, []);

  const saveCart = useCallback((items) => {
    try {
      if (!Array.isArray(items)) throw new Error("Cart must be an array");
      const validItems = items.filter((item) => item && (item.id || item._id));
      const cartKey = getCartKey();
      localStorage.setItem(cartKey, JSON.stringify(validItems));
      setCartItems(validItems);
      window.dispatchEvent(new Event("cart-updated"));
      console.log("💾 Cart saved:", validItems.length, "items to", cartKey);
    } catch (error) {
      console.error("❌ Error saving cart:", error);
    }
  }, []);

  const updateQuantity = useCallback(
    (itemId, change) => {
      try {
        if (!itemId || typeof change !== "number") {
          console.warn("Invalid parameters for updateQuantity");
          return;
        }
        const updated = cartItems.map((item) => {
          if (getItemId(item) === itemId) {
            const newQty = Math.max(1, (item.quantity || 1) + change);
            return { ...item, quantity: newQty };
          }
          return item;
        });
        saveCart(updated);
      } catch (error) {
        console.error("❌ Error updating quantity:", error);
      }
    },
    [cartItems, saveCart],
  );

  const removeItem = (itemId) => {
    const updated = cartItems.filter((item) => getItemId(item) !== itemId);
    saveCart(updated);
  };

  const clearCart = () => {
    if (window.confirm("Are you sure you want to clear your cart?")) {
      saveCart([]);
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = item.quantity || 1;
      return total + price * quantity;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const shipping = subtotal > 0 ? (subtotal > 50 ? 0 : 5.99) : 0;
  const tax = subtotal * 0.1;
  const total = subtotal + shipping + tax;

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    alert(
      "TRYMI says - this is just a personal project, will implement payment gateway if required in future. Thank you for your cooperation.",
    );
  };

  return (
    <div className="cart-page-container">
      <div className="cart-header-section">
        <div className="cart-header-wrapper">
          <button className="cart-back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </button>
          <div className="cart-title-info">
            <h1 className="cart-main-title">🛒 Shopping Cart</h1>
            <p className="cart-item-count">
              {cartItems.length} {cartItems.length === 1 ? "item" : "items"} in
              your cart
            </p>
          </div>
          {cartItems.length > 0 && (
            <button className="cart-clear-all-btn" onClick={clearCart}>
              <FaTrash /> Clear Cart
            </button>
          )}
        </div>
      </div>

      <div className="cart-content-container">
        {cartItems.length === 0 ? (
          <div className="cart-empty-state">
            <div className="cart-empty-icon">🛍️</div>
            <h2 className="cart-empty-title">Your Cart is Empty</h2>
            <p className="cart-empty-text">Start shopping and add some items to your cart!</p>
            <div className="cart-empty-actions">
              <button
                className="cart-browse-btn"
                onClick={() => navigate("/collections")}
              >
                <FaShoppingBag /> Browse Collections
              </button>
              <button className="cart-home-btn" onClick={() => navigate("/")}>
                Go Home
              </button>
            </div>
          </div>
        ) : (
          <div className="cart-main-grid">
            <div className="cart-items-list">
              {cartItems.map((item) => (
                <div key={getItemId(item)} className="cart-item-card">
                  <div className="cart-item-img-box">
                    <img
                      src={
                        item.image ||
                        item.preview ||
                        "https://via.placeholder.com/150"
                      }
                      alt={item.name}
                      className="cart-item-img"
                    />
                  </div>

                  <div className="cart-item-content">
                    <div className="cart-item-top">
                      <h3 className="cart-item-name">{item.name}</h3>
                      <button
                        className="cart-item-remove-btn"
                        onClick={() => removeItem(getItemId(item))}
                        title="Remove item"
                      >
                        <FaTrash />
                      </button>
                    </div>

                    {item.category && (
                      <span className="cart-item-tag">{item.category}</span>
                    )}

                    {item.emoji && (
                      <div className="cart-item-emoji-display">{item.emoji}</div>
                    )}

                    {/* Outfit Items */}
                    {item.type === "outfit" && item.items && (
                      <div className="cart-outfit-details">
                        <div key="outfit-label-text">
                          <strong>Custom Outfit:</strong>
                        </div>
                        {item.items.top && (
                          <div key="outfit-top-item">
                            👕 Top: {item.items.top.name}
                          </div>
                        )}
                        {item.items.bottom && (
                          <div key="outfit-bottom-item">
                            👖 Bottom: {item.items.bottom.name}
                          </div>
                        )}
                        {item.items.footwear && (
                          <div key="outfit-footwear-item">
                            👟 Footwear: {item.items.footwear.name}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="cart-item-bottom-row">
                      <div className="cart-qty-selector">
                        <button
                          className="qty-btn qty-minus"
                          onClick={() => updateQuantity(getItemId(item), -1)}
                          disabled={(item.quantity || 1) <= 1}
                        >
                          <FaMinus />
                        </button>
                        <span className="qty-val">{item.quantity || 1}</span>
                        <button
                          className="qty-btn qty-plus"
                          onClick={() => updateQuantity(getItemId(item), 1)}
                        >
                          <FaPlus />
                        </button>
                      </div>
                      <div className="cart-item-final-price">
                        ₹
                        {(
                          (parseFloat(item.price) || 0) * (item.quantity || 1)
                        ).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary-card">
              <h2 className="summary-title">Order Summary</h2>

              <div className="summary-data-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="summary-data-row">
                <span>Shipping</span>
                <span>
                  {shipping === 0 ? (
                    <span className="summary-free-badge">FREE</span>
                  ) : (
                    `₹${shipping.toFixed(2)}`
                  )}
                </span>
              </div>

              <div className="summary-data-row">
                <span>Tax (10%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>

              <div className="summary-hr"></div>

              <div className="summary-data-row summary-total-row">
                <span className="total-label">Total</span>
                <span className="total-value">₹{total.toFixed(2)}</span>
              </div>

              {subtotal > 0 && subtotal < 50 && (
                <p className="summary-shipping-promo">
                  💡 Add ₹{(50 - subtotal).toFixed(2)} more for FREE shipping!
                </p>
              )}

              <button className="cart-checkout-btn" onClick={handleCheckout}>
                Proceed to Checkout
              </button>

              <button
                className="cart-continue-btn"
                onClick={() => navigate("/collections")}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;


