import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FaSearch,
  FaHeart,
  FaShoppingCart,
  FaUser,
  FaCheck,
  FaFire,
  FaCommentDots,
} from "react-icons/fa";
import "../styles/collections.css";
import useWishlistStore from "../../store/wishlistStore";
import AtelierLoader from "@core/AtelierLoader.jsx";

const API_URL = "https://trymi-backend.onrender.com";

const Collections = () => {
  const navigate = useNavigate();
  const { category: urlCategory } = useParams();

  // Helper to determine if a string is a gender or category
  const getInitialFilters = (urlParam) => {
    if (!urlParam) return { category: "all", gender: "all" };

    const genders = {
      women: "womens",
      womens: "womens",
      men: "mens",
      mens: "mens",
      kids: "kids",
    };

    if (genders[urlParam.toLowerCase()]) {
      return { category: "all", gender: genders[urlParam.toLowerCase()] };
    }

    return { category: urlParam.toLowerCase(), gender: "all" };
  };

  const initialFilters = getInitialFilters(urlCategory);
  const [selectedCategory, setSelectedCategory] = useState(
    initialFilters.category,
  );
  const [selectedGender, setSelectedGender] = useState(initialFilters.gender);
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shuffledAllItems, setShuffledAllItems] = useState([]);

  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  // Wishlist state from Zustand store
  const { wishlist, addToWishlist, removeFromWishlist, isInWishlist } =
    useWishlistStore();

  // Cart state
  const [cart, setCart] = useState([]);
  const [cartCount, setCartCount] = useState(0);

  // Get current user
  const [currentUser, setCurrentUser] = useState(null);

  // ✅ Fix: Missing refs for fetchProducts
  const abortControllerRef = useRef(null);
  const isFirstMountRef = useRef(true);



  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 3000);
  }, []);

  // Load user from localStorage - check multiple possible keys
  useEffect(() => {
    console.log("🔍 Looking for user in localStorage...");
    const possibleKeys = ["user", "trymi_user", "currentUser", "authUser"];

    let foundUser = null;
    for (const key of possibleKeys) {
      const userData = localStorage.getItem(key);
      if (userData) {
        try {
          const user = JSON.parse(userData);
          if (user && (user._id || user.id || user.email)) {
            foundUser = user;
            console.log(`✅ User found in localStorage key: "${key}"`);
            console.log("👤 User data:", {
              id: user._id || user.id,
              email: user.email,
              name: user.name,
            });
            break;
          }
        } catch (e) {
          console.error(`Error parsing user data from key "${key}": `, e);
        }
      }
    }

    if (foundUser) {
      setCurrentUser(foundUser);
    } else {
      console.log("⚠️ No user found in localStorage");
      console.log("📦 Available localStorage keys:", Object.keys(localStorage));
    }
  }, []);

  const handleVirtualTryClick = useCallback(() => {
    try {
      navigate("/virtual-try-on");
    } catch (error) {
      console.error("❌ Navigation error:", error);
      showToast("Failed to navigate", "error");
    }
  }, [navigate]);

  const handleStudioClick = useCallback(() => {
    try {
      navigate("/studio");
    } catch (error) {
      console.error("❌ Navigation error:", error);
      showToast("Failed to navigate", "error");
    }
  }, [navigate]);

  const loadCart = useCallback(() => {
    try {
      const userId = localStorage.getItem("userId");
      const cartKey = userId ? `trymi_cart_${userId}` : "trymi_cart";
      const storedCart = localStorage.getItem(cartKey);
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        if (!Array.isArray(parsedCart)) throw new Error("Invalid cart format");

        const validCart = parsedCart.filter(
          (item) => item && (item.id || item._id),
        );
        setCart(validCart);
        const total = validCart.reduce(
          (sum, item) => sum + (item.quantity || 1),
          0,
        );
        setCartCount(total);
        console.log(
          "🛒 Cart loaded:",
          validCart.length,
          "items, total count:",
          total,
        );
      } else {
        setCart([]);
        setCartCount(0);
      }
    } catch (e) {
      console.warn("⚠️ Invalid cart data, clearing:", e.message);
      const userId = localStorage.getItem("userId");
      const cartKey = userId ? `trymi_cart_${userId}` : "trymi_cart";
      localStorage.removeItem(cartKey);
      setCart([]);
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    const handleCartUpdate = () => {
      console.log("🔄 Cart updated from another component");
      loadCart();
    };

    const handleStorageUpdate = (e) => {
      const userId = localStorage.getItem("userId");
      const cartKey = userId ? `trymi_cart_${userId}` : "trymi_cart";
      if (!e.key || e.key === cartKey) {
        console.log("🔄 Cart storage updated");
        loadCart();
      }
    };

    window.addEventListener("cart-updated", handleCartUpdate);
    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      window.removeEventListener("cart-updated", handleCartUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  const updateCart = useCallback((updatedCart) => {
    try {
      if (!Array.isArray(updatedCart)) throw new Error("Cart must be an array");
      const validCart = updatedCart.filter(
        (item) => item && (item.id || item._id),
      );
      setCart(validCart);
      const userId = localStorage.getItem("userId");
      const cartKey = userId ? `trymi_cart_${userId}` : "trymi_cart";
      localStorage.setItem(cartKey, JSON.stringify(validCart));
      const total = validCart.reduce(
        (sum, item) => sum + (item.quantity || 1),
        0,
      );
      setCartCount(total);
      window.dispatchEvent(new Event("cart-updated"));
      console.log(
        "🛒 Cart updated:",
        validCart.length,
        "items, total count:",
        total,
      );
    } catch (error) {
      console.error("❌ Error updating cart:", error.message);
      showToast("Failed to update cart", "error");
    }
  }, []);

  const fetchProducts = useCallback(
    async () => {
      // 1. Abort any previous pending request (but not on very first mount)
      if (abortControllerRef.current && !isFirstMountRef.current) {
        console.log("🔄 Aborting previous request...");
        abortControllerRef.current.abort();
      }

      // Mark that we've completed first mount
      if (isFirstMountRef.current) {
        isFirstMountRef.current = false;
      }

      // 2. Create new controller for current request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setLoading(true);
        setError(null);

        // Increase timeout to 120s for large base64 payloads
        const timeoutId = setTimeout(() => {
          console.error("⏳ [FRONTEND] Fetch request timed out after 120s");
          controller.abort();
        }, 120000);

        const url = `${API_URL}/api/collections`;
        console.log(`📡 [FRONTEND] Fetching ALL products from: ${url}`);

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log("📊 [FRONTEND] API Result Structure:", Object.keys(result));

        let productsArray = [];
        if (result.success && Array.isArray(result.data)) {
          productsArray = result.data;
        } else if (result.success && Array.isArray(result.products)) {
          productsArray = result.products;
        } else if (Array.isArray(result)) {
          productsArray = result;
        } else if (Array.isArray(result.data)) {
          productsArray = result.data;
        }

        console.log(`📊 [FRONTEND] Extracted ${productsArray.length} products from response`);

        if (productsArray && productsArray.length > 0) {
          setError(null);
          const normalized = productsArray.map(p => ({
            ...p,
            _id: (p._id || p.id || Math.random().toString(36).substr(2, 9)).toString(),
            title: p.name || p.title || "Untitled Product",
            category: (p.category || "uncategorized").toLowerCase(),
            gender: (p.gender || "unisex").toLowerCase()
          }));

          console.log(`✅ [FRONTEND] Successfully loaded and normalized ${normalized.length} products`);
          setAllProducts(normalized);
          setLoading(false);
        } else {
          console.warn("📭 [FRONTEND] API returned no products");
          setAllProducts([]);
          setError("No products found in database");
        }
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("❌ [FRONTEND] Error fetching products:", error);
        setError(error.message || "Failed to load products");
      } finally {
        // Ensure we only turn off loading if this is still the active request
        if (abortControllerRef.current === controller) {
          setLoading(false);
        }
      }
    },
    [showToast],
  );

  // ✅ Fetch products when selected category changes
  useEffect(() => {
    if (urlCategory) {
      const { category: newCat, gender: newGen } =
        getInitialFilters(urlCategory);
      setSelectedCategory(newCat);
      setSelectedGender(newGen);
    }
  }, [urlCategory]);

  useEffect(() => {
    fetchProducts(); // Initial fetch all
  }, [fetchProducts]);

  // ✅ Shuffle utility function
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    if (selectedCategory === "all" && allProducts.length > 0) {
      setShuffledAllItems(shuffleArray(allProducts));
    }
  }, [selectedCategory, allProducts]);

  // ✅ Helper to format images correctly
  const getProductImage = (image) => {
    if (!image) return "https://placehold.co/400x500?text=No+Image";

    // 1. Handle full data URIs (base64)
    if (image.startsWith("data:")) return image;

    // 2. Handle raw base64 strings (missing header)
    if (image.length > 100 && !image.includes("/") && !image.includes(".")) {
      return `data:image/png;base64,${image}`;
    }

    // 3. Handle external URLs
    if (image.startsWith("http")) return image;

    // 4. Handle relative paths (uploads)
    if (image.startsWith("uploads/") || image.startsWith("/uploads/")) {
      const cleanPath = image.startsWith("/") ? image.substring(1) : image;
      return `${API_URL}/${cleanPath}`;
    }

    return image;
  };

  const getFilteredItems = useCallback(() => {
    if (allProducts.length === 0) return [];

    console.log(`🔍 [FRONTEND] Filtering ${allProducts.length} items: Category=${selectedCategory}, Gender=${selectedGender}`);

    // Use shuffled items for "All Items" view if no specific filter is active
    let baseItems = (selectedCategory === "all" && selectedGender === "all" && shuffledAllItems.length > 0)
      ? shuffledAllItems
      : allProducts;

    let filtered = [...baseItems];

    // 1. Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // 2. Filter by gender
    if (selectedGender !== "all") {
      filtered = filtered.filter(item => {
        const itemGender = item.gender?.toLowerCase() || "unisex";
        const targetGender = selectedGender.toLowerCase();

        // Match specific gender, OR unisex, OR "all" (if applicable)
        return (
          itemGender === targetGender ||
          itemGender === "unisex" ||
          itemGender === "all" ||
          (targetGender === "womens" && (itemGender === "women" || itemGender === "womens")) ||
          (targetGender === "mens" && (itemGender === "men" || itemGender === "mens"))
        );
      });
    }

    console.log(`✅ [FRONTEND] Final filtered count: ${filtered.length}`);
    return filtered;
  }, [allProducts, selectedCategory, selectedGender, shuffledAllItems]);

  const filteredItems = getFilteredItems();


  // Simplified wishlist handling using the store
  const toggleWishlist = (item, e) => {
    e.stopPropagation();

    // Check if user is logged in
    if (!currentUser) {
      showToast("Please login to add items to wishlist", "info");
      setTimeout(() => navigate("/login"), 1500);
      return;
    }

    const productId = item._id;

    if (isInWishlist(productId)) {
      removeFromWishlist(productId);
      console.log("❤️ Removed from wishlist:", item.title);
      showToast(`${item.title} removed from wishlist`, "info");
    } else {
      const wishlistItem = {
        _id: item._id,
        id: item._id,
        title: item.title,
        name: item.title,
        image: item.image,
        price: item.priceRange || item.price,
        category: item.category,
        gender: item.gender || selectedGender,
        description: item.description,
        addedAt: new Date().toISOString(),
      };
      addToWishlist(wishlistItem);
      console.log("❤️ Added to wishlist:", item.title);
      showToast(`${item.title} added to wishlist ❤️`, "success");
    }
  };

  const addToCart = (item, e) => {
    e.stopPropagation();
    const existingItem = cart.find(
      (cartItem) => cartItem.id === item._id || cartItem._id === item._id,
    );

    let updatedCart;
    if (existingItem) {
      updatedCart = cart.map((cartItem) =>
        cartItem.id === item._id || cartItem._id === item._id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem,
      );
      console.log("🛒 Increased quantity in cart:", item.title);
      showToast(`${item.title} quantity increased in cart`, "success");
    } else {
      const newItem = {
        id: item._id,
        _id: item._id,
        name: item.title,
        title: item.title,
        image: item.image,
        price: item.priceRange || item.price,
        priceRange: item.priceRange || item.price,
        category: item.category,
        description: item.description,
        quantity: 1,
        addedAt: new Date().toISOString(),
      };
      updatedCart = [...cart, newItem];
      console.log("🛒 Added to cart:", item.title);
      showToast(`${item.title} added to cart! 🛒`, "success");
    }
    updateCart(updatedCart);
  };

  const handleAskAI = (item, e) => {
    e.stopPropagation();
    const productQuery = {
      product: item.title,
      category: item.category,
      description: item.description,
      price: item.priceRange || item.price,
      gender: item.gender,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("ai_product_query", JSON.stringify(productQuery));
    window.dispatchEvent(
      new CustomEvent("open-chatbot", {
        detail: {
          message: `Tell me more about the ${item.title}. What occasions is it best for? How should I style it? What other items would pair well with it?`,
          product: productQuery,
        },
      }),
    );
    showToast(`AI assistant ready to help with ${item.title} ! 🤖`, "success");
    console.log("🤖 Opening AI chat for product:", item.title);
  };

  const goToWishlist = () => navigate("/wishlist");
  const goToCart = () => navigate("/cart");


  const categories = [
    { value: "all", label: "All Items" },
    { value: "shirts", label: "Shirts" },
    { value: "tshirts", label: "T-Shirts" },
    { value: "pants", label: "Pants" },
    // { value: "dresses", label: "Dresses" },
    { value: "kids-shirts", label: "Kids Shirts" },
    { value: "kids-pants", label: "Kids Pants" },
  ];

  if (loading) {
    return <AtelierLoader />;
  }

  return (
    <div className="collections-page">
      {toast.show && (
        <div
          className={`toast ${toast.type === "success" ? "toast-success" : toast.type === "error" ? "toast-error" : "toast-info"} `}
        >
          <FaCheck />
          <span>{toast.message}</span>
        </div>
      )}

      <div className="top-banner">
        <div className="banner-left">
          <span>TRYMI</span>
          <span className="banner-separator">|</span>
          <button
            className="feedback-banner-btn"
            onClick={() => window.dispatchEvent(new CustomEvent("open-feedback"))}
          >
            Drop Feedback!
          </button>
        </div>
        <button
          className="auth-btn"
          onClick={() => navigate(currentUser ? "/profile" : "/login")}
        >
          <FaUser /> {currentUser ? currentUser.name : "Login"}
        </button>
      </div>

      <nav className="navbar">
        <div className="navbar-container">
          <div className="nav-left">
            <Link to="/outfit-predictor">
              <h1 className="logo">TRYMI</h1>
            </Link>
            <ul className="nav-menu">
              <li>
                <Link
                  to="/outfit-predictor"
                  className="nav-link"
                >
                  Home
                </Link>
              </li>
              <li>
                <span className="nav-link-active">
                  Collections
                </span>
              </li>
              <li>
                <span
                  className="nav-link"
                  onClick={() => {
                    handleVirtualTryClick();
                  }}
                >
                  Virtual Try-On
                </span>
              </li>
              <li style={{ position: "relative" }}>
                <span
                  className="nav-link"
                  onClick={() => {
                    handleStudioClick();
                  }}
                  style={{ cursor: "pointer" }}
                >
                  Studio
                  <span
                    style={{
                      position: "absolute",
                      top: "-10px",
                      right: "-12px",
                      color: "#FF4444",
                      fontSize: "10px",
                      animation:
                        "navBounce 0.8s infinite alternate ease-in-out",
                    }}
                  >
                    <FaFire />
                  </span>
                </span>
              </li>
              <li>
                <Link to="/about" className="nav-link">
                  About
                </Link>
              </li>
            </ul>
          </div>

          <div className="nav-icons">
            <button className="icon-btn">
              <FaSearch />
            </button>
            <button
              className="icon-btn"
              onClick={goToWishlist}
              onMouseEnter={() => setHoveredIcon("wishlist")}
              onMouseLeave={() => setHoveredIcon(null)}
            >
              <FaHeart
                style={{
                  color: hoveredIcon === "wishlist" ? "#FF4444" : "#1a1a1a",
                }}
              />
              {wishlist.length > 0 && (
                <span className="badge">{wishlist.length}</span>
              )}
            </button>
            <button
              className="icon-btn"
              onClick={goToCart}
              onMouseEnter={() => setHoveredIcon("cart")}
              onMouseLeave={() => setHoveredIcon(null)}
            >
              <FaShoppingCart
                style={{
                  color: hoveredIcon === "cart" ? "#4CAF50" : "#1a1a1a",
                }}
              />
              {cartCount > 0 && <span className="badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </nav>

      <section className="collections-hero">
        <h2 className="collections-hero-title">Collections</h2>
      </section>

      <div className="category-buttons">
        {categories.map((cat) => (
          <button
            key={cat.value}
            className={`category-btn ${selectedCategory === cat.value ? "category-btn-active" : ""}`}
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="filter-section">
        <div className="filter-left">
          {filteredItems.length} {filteredItems.length === 1 ? "Item" : "Items"}
        </div>
        <div className="filter-controls">
          <select
            className="filter-select"
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
          >
            <option value="all">All Genders</option>
            <option value="mens">Men's</option>
            <option value="womens">Women's</option>
          </select>
          <button
            className="refresh-btn"
            onClick={() => fetchProducts(selectedCategory, selectedGender)}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="collection-grid">
        {error ? (
          <div className="error-state">
            <p className="error-msg">⚠️ {error}</p>
            <button className="refresh-btn" onClick={() => fetchProducts()}>Try Again</button>
          </div>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div
              key={item._id}
              className="item-card"
              onMouseEnter={() => setHoveredCard(item._id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="image-container">
                <img
                  src={getProductImage(item.image)}
                  alt={item.title}
                  className="item-image"
                  onError={(e) => {
                    console.warn(`⚠️ Image failed to load for: ${item.title}`);
                    e.target.src = "https://placehold.co/400x500?text=No+Image";
                  }}
                />
                <button
                  className={`col-heart-btn ${isInWishlist(item._id) ? "col-heart-btn--active" : ""}`}
                  onClick={(e) => toggleWishlist(item, e)}
                >
                  <FaHeart />
                </button>
                {hoveredCard === item._id && (
                  <div className="hover-overlay">
                    <div className="hover-actions">
                      <button
                        className="action-btn add-cart-btn"
                        onClick={(e) => addToCart(item, e)}
                        disabled={loading}
                      >
                        <FaShoppingCart /> {loading ? "..." : "Add to Cart"}
                      </button>

                      <button
                        className="action-btn ai-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAskAI(item, e);
                        }}
                      >
                        ⚡ Ask AI
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="item-details">
                <h3 className="item-title">{item.title}</h3>
                <p className="item-description">{item.description}</p>
                <div className="color-swatches">
                  {item.colors &&
                    item.colors.map((color, idx) => (
                      <span
                        key={idx}
                        className="color-swatch"
                        style={{ backgroundColor: color }}
                      ></span>
                    ))}
                </div>
                <p className="item-price">
                  {item.price ? `₹${item.price.toString().replace('$', '').replace('₹', '')}` : (item.priceRange || "Price not available")}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>No items found for {selectedCategory === 'all' ? 'All Items' : selectedCategory} in {selectedGender === 'all' ? 'All Genders' : selectedGender}.</p>
            <button className="refresh-btn" onClick={() => fetchProducts()}>Refresh Catalog</button>
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner">
          <p>⚠️ {error}</p>
        </div>
      )}
    </div>
  );
};

export default Collections;


