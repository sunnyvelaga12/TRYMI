import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  FaSearch,
  FaHeart,
  FaShoppingCart,
  FaUser,
  FaMapMarkerAlt,
  FaCog,
  FaFire,
  FaCommentDots,
} from "react-icons/fa";
import "../styles/outfitpredictor.css";
import useWishlistStore from "../../store/wishlistStore";
import AtelierLoader from "@core/AtelierLoader.jsx";

const OutfitPredictor = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [productCollections, setProductCollections] = useState({
    women: [],
    men: [],
    kids: [],
    other: [],
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [revealedSections, setRevealedSections] = useState(new Set());
  const navigate = useNavigate();
  const scrollRefs = useRef({});

  const slides = [
    {
      tag: "MEN'S FASHION",
      title: "MEN'S",
      subtitle: "Fashion",
      description:
        "Refined formal wear for distinguished occasions and unforgettable moments.",
      image:
        "https://tomandlorenzo.com/wp-content/uploads/2025/03/Zara-Studio-Summer-2025-Menswear-Collection-Style-Fashion-Trends-TLO-1.jpg",
      cta: "Shop Men",
      theme: "dark",
    },
    {
      tag: "WOMEN'S FASHION",
      title: "High Fashion",
      subtitle: "Editorial",
      description:
        "Discover timeless pieces crafted with unparalleled attention to detail and sustainable luxury.",
      image:
        "https://images.only.com/media/o4wdu5v2/on-storefront-w07-01-en.jpg?v=ed56173c-6092-44e3-a9af-952cf629258c&format=webp&width=2048&quality=80&key=1-1-3&bg-color=%23f5f5f5",
      cta: "Shop Women",
      theme: "dark",
    },
    {
      tag: "MEN'S COLLECTION",
      title: "Tailored",
      subtitle: "Sophistication",
      description:
        "Contemporary menswear combining classic tailoring with modern elegance and precision.",
      image:
        "https://media.johnlewiscontent.com/i/JohnLewis/mens-nightwear-editorial-thumb-241125?fmt=auto&wid=599&sm=aspect&aspect=5:4",
      cta: "Shop Men",
      theme: "light",
    },
    {
      tag: "KIDS' FASHION",
      title: "Little",
      subtitle: "Trendsetters",
      description:
        "Stylish and comfortable designs crafted for the youngest fashion enthusiasts.",
      image:
        "https://img.freepik.com/free-photo/full-shot-kids-posing-together_23-2149853383.jpg?semt=ais_wordcount_boost&w=740&q=80",
      cta: "Shop Kids",
      theme: "light",
    },
    {
      tag: "WOMEN'S CHIC",
      title: "Urban",
      subtitle: "Elegance",
      description:
        "Clean lines and sophisticated design for the modern cosmopolitan wardrobe.",
      image:
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1100&h=1500&fit=crop&q=90",
      cta: "Shop Women",
      theme: "dark",
    },

    {
      tag: "KIDS' ADVENTURE",
      title: "Playful",
      subtitle: "Spirit",
      description:
        "Durable and fun designs that keep up with every adventure and imagination.",
      image:
        "https://brand.assets.adidas.com/image/upload/f_auto,q_auto:best,fl_lossy/1_4_db22d38bfc.jpg",
      cta: "Shop Kids",
      theme: "dark",
    },
    {
      tag: "MEN'S HERITAGE",
      title: "Classic",
      subtitle: "Tailoring",
      description:
        "Timeless elegance with impeccable cuts and premium fabrics for discerning gentlemen.",
      image:
        "https://static.zara.net/assets/public/b8f7/15ef/5a0345b2be5a/7862faab6310/04652350800-p/04652350800-p.jpg?ts=1759161705165",
      cta: "Shop Men",
      theme: "dark",
    },
    {
      tag: "WOMEN'S RESORT",
      title: "Summer",
      subtitle: "Luxe",
      description:
        "Breezy silhouettes and vibrant hues perfect for endless summer escapes.",
      image:
        "https://cdn.shopify.com/s/files/1/0573/2689/5255/files/2150360982_1_600x600.jpg?v=1713725903",
      cta: "Shop Women",
      theme: "light",
    },
    {
      tag: "KIDS' STYLE",
      title: "Modern",
      subtitle: "Comfort",
      description:
        "Effortlessly cool designs combining comfort with contemporary fashion trends.",
      image:
        "https://www.smallchangeconsignments.com/wp-content/uploads/2020/12/AAB_FashionMamas_KidsFashionFair_900x600.jpg",
      cta: "Shop Kids",
      theme: "light",
    },
    {
      tag: "MEN'S FORMAL",
      title: "Evening",
      subtitle: "Distinction",
      description:
        "Refined formal wear for distinguished occasions and unforgettable moments.",
      image:
        "https://static.zara.net/assets/public/7232/1c11/57c8438b8617/648d657fd948/04456999800-p/04456999800-p.jpg?ts=1770109333781&w=352",
      cta: "Shop Men",
      theme: "dark",
    },
  ];

  const { wishlist, addToWishlist, removeFromWishlist, isInWishlist } =
    useWishlistStore();

  // ✅ CHECK AUTHORIZATION - Redirect unauthorized users to signup
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    const user = localStorage.getItem("user");
    const userId = localStorage.getItem("userId");

    console.log("🔐 Authorization Check:");
    console.log("  - isAuthenticated:", isAuthenticated);
    console.log("  - user:", !!user);
    console.log("  - userId:", userId);

    // If not authenticated, redirect to signup
    if (!isAuthenticated || !user || !userId) {
      console.warn("⚠️ Unauthorized user detected - redirecting to signup");
      navigate("/signup", { replace: true });
      return;
    }

    console.log("✅ User is authenticated");
  }, [navigate]);

  // ✅ Load and organize products
  useEffect(() => {
    const loadUserProducts = () => {
      try {
        // Load wishlist from store
        // Map to ensure we have the actual product objects even if nested
        const wishlistItems = wishlist.map((item) =>
          item.productId && typeof item.productId === "object"
            ? { ...item.productId, wishlistEntryId: item._id || item.id }
            : item.product && typeof item.product === "object"
              ? { ...item.product, wishlistEntryId: item._id || item.id }
              : item,
        );

        // Load cart
        const userId = localStorage.getItem("userId");
        const cartKey = userId ? `trymi_cart_${userId}` : "trymi_cart";
        const storedCart = localStorage.getItem(cartKey);
        let rawCartItems = [];
        try {
          rawCartItems = storedCart ? JSON.parse(storedCart) : [];
        } catch (e) {
          console.error("Error parsing cart:", e);
          rawCartItems = [];
        }

        const cartItems = rawCartItems.map((item) =>
          item.productId && typeof item.productId === "object"
            ? { ...item.productId, cartEntryId: item._id || item.id }
            : item.product && typeof item.product === "object"
              ? { ...item.product, cartEntryId: item._id || item.id }
              : item,
        );

        //Combine and organize by category
        const allItems = [...wishlistItems, ...cartItems];

        // Organize by category
        const organized = {
          women: allItems.filter((item) => {
            const gender = (item.gender || "").toLowerCase();
            const cat = (item.category || "").toLowerCase();
            return (
              gender.includes("women") ||
              cat.includes("women") ||
              gender === "womens"
            );
          }),
          men: allItems.filter((item) => {
            const gender = (item.gender || "").toLowerCase();
            const cat = (item.category || "").toLowerCase();
            return (
              (gender.includes("men") && !gender.includes("women")) ||
              (cat.includes("men") && !cat.includes("women")) ||
              gender === "mens"
            );
          }),
          kids: allItems.filter((item) => {
            const gender = (item.gender || "").toLowerCase();
            const cat = (item.category || "").toLowerCase();
            return gender.includes("kids") || cat.includes("kids");
          }),
          other: allItems.filter((item) => {
            const gender = (item.gender || "").toLowerCase();
            const cat = (item.category || "").toLowerCase();
            return (
              !gender.includes("women") &&
              !cat.includes("women") &&
              !gender.includes("men") &&
              !cat.includes("men") &&
              !gender.includes("kids") &&
              !cat.includes("kids")
            );
          }),
        };

        setProductCollections(organized);
        setIsLoadingProducts(false);

        console.log("💝 Loaded wishlist items:", wishlistItems.length);
        console.log("🛒 Loaded cart items:", cartItems.length);
        console.log("📦 Organized products:", {
          women: organized.women.length,
          men: organized.men.length,
          kids: organized.kids.length,
        });
      } catch (error) {
        console.error("❌ Error loading products:", error);
        setProductCollections({ women: [], men: [], kids: [], other: [] });
        setIsLoadingProducts(false);
      }
    };

    loadUserProducts();

    const handleStorageUpdate = (e) => {
      const userId = localStorage.getItem("userId");
      const cartKey = userId ? `trymi_cart_${userId}` : "trymi_cart";
      if (!e.key || e.key === "trymi_wishlist" || e.key === cartKey) {
        loadUserProducts();
      }
    };

    window.addEventListener("wishlist-updated", loadUserProducts);
    window.addEventListener("cart-updated", loadUserProducts);
    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      window.removeEventListener("wishlist-updated", loadUserProducts);
      window.removeEventListener("cart-updated", loadUserProducts);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, [wishlist]);

  // ✅ Separate effect for Intersection Observer to re-run when products change
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealedSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1 },
    );

    const timer = setTimeout(() => {
      document.querySelectorAll("section").forEach((section) => {
        if (
          section.id &&
          (section.id.startsWith("section-") || section.id === "studio-banner")
        ) {
          observer.observe(section);
        }
      });
    }, 500);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [productCollections]);

  useEffect(() => {
    setIsVisible(true);
    let timer;
    if (isAutoPlaying) {
      timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
    }
    return () => clearInterval(timer);
  }, [isAutoPlaying, slides.length]);

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
  };

  const handleSlideClick = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  const handleTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) handleNextSlide();
    if (distance < -50) handlePrevSlide();
    setTouchStart(0);
    setTouchEnd(0);
  };

  // ✅ UPDATED: 3D Avatar Virtual Try-On handler
  const handleVirtualTryClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      navigate("/virtual-try-on");
    } catch {
      window.location.href = "/virtual-try-on";
    }
  };

  // ✅ NEW: AI Studio Virtual Try-On handler
  const handleStudioClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      navigate("/studio");
    } catch {
      window.location.href = "/studio";
    }
  };

  const handleWishlistClick = useCallback(() => {
    try {
      navigate("/wishlist");
    } catch (error) {
      console.error("Navigation error:", error);
    }
  }, [navigate]);

  const handleCartClick = useCallback(() => {
    try {
      navigate("/cart");
    } catch (error) {
      console.error("Navigation error:", error);
    }
  }, [navigate]);

  const handleLogout = useCallback(() => {
    try {
      // Clear all authentication data
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
      sessionStorage.clear();
      setShowUserMenu(false);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      window.location.replace("/login");
    }
  }, [navigate]);

  const handleScrollClick = useCallback((category, direction) => {
    const container = scrollRefs.current[category];
    if (!container) {
      console.warn(`Container for category ${category} not found`);
      return;
    }

    const scrollAmount = 320;
    const newScrollPosition =
      direction === "left"
        ? Math.max(0, container.scrollLeft - scrollAmount)
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollPosition,
      behavior: "smooth",
    });
  }, []);

  const handleProductClick = useCallback(
    (productId, category) => {
      try {
        // Navigate to collections page with the specific category and product
        // Store the product ID to scroll to it after navigation
        sessionStorage.setItem("scroll_to_product", productId);
        navigate(`/collections/${category || ""}`);
      } catch (error) {
        console.error("Navigation error:", error);
      }
    },
    [navigate],
  );

  const renderProductSection = (category, title, viewAllLink) => {
    const allProducts = productCollections[category] || [];

    // ✅ PRODUCTION FIX: Deduplicate products by ID to prevent React duplicate key warnings
    const products = Array.from(
      new Map(allProducts.map((item) => [item._id || item.id, item])).values(),
    );

    // Show empty state if no wishlist/cart items for this category
    if (products.length === 0) {
      return null; // Don't show section if empty
    }

    return (
      <section
        id={`section-${category}`}
        className={`product-scroll-section ${revealedSections.has(`section-${category}`) ? "reveal" : "hide"}`}
        key={category}
      >
        <div className="section-header">
          <h2>{title}</h2>
          <Link to={viewAllLink} className="view-all-link">
            View All →
          </Link>
        </div>

        <div className="scroll-container">
          <button
            className="scroll-arrow scroll-arrow-left"
            onClick={() => handleScrollClick(category, "left")}
            aria-label="Scroll left"
          >
            ←
          </button>

          <div
            className="products-wrapper"
            ref={(el) => (scrollRefs.current[category] = el)}
          >
            {products.map((product, index) => (
              <div
                key={`${product._id || product.id}-${index}`}
                className="product-card"
                onClick={() =>
                  handleProductClick(product._id || product.id, category)
                }
                style={{ cursor: "pointer" }}
              >
                <div className="product-image-wrapper">
                  <img
                    src={product.image || product.imageUrl}
                    alt={product.title || product.name}
                    className="product-image"
                    loading="lazy"
                  />
                  <div className="product-overlay">
                    <button className="quick-view-btn">Quick View</button>
                  </div>
                </div>
                <div className="product-info">
                  <h3 className="product-name">
                    {product.title || product.name}
                  </h3>
                  <p className="product-price">
                    {product.price || product.priceRange}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            className="scroll-arrow scroll-arrow-right"
            onClick={() => handleScrollClick(category, "right")}
            aria-label="Scroll right"
          >
            →
          </button>
        </div>
      </section>
    );
  };
  const handleHeroCtaClick = (ctaText) => {
    const text = ctaText.toLowerCase();
    if (text.includes("women")) {
      navigate("/collections/women");
    } else if (text.includes("men")) {
      navigate("/collections/men");
    } else if (text.includes("kids")) {
      navigate("/collections/kids");
    } else {
      navigate("/collections");
    }
  };

  if (isLoadingProducts) {
    return <AtelierLoader />;
  }

  return (
    <div className="page">
      {/* Top Banner */}
      <div className="top-banner">
        <div className="banner-left">
          <a href="#" className="banner-link">

          </a>
          <a href="#" className="banner-link">
            TRYMI
          </a>
        </div>
        <div className="top-right">
          <button
            className="feedback-banner-btn"
            onClick={() => navigate("/profile", { state: { activeTab: "feedback" } })}
            aria-label="Drop feedback"
          >
            Drop Feedback
          </button>
          <div className="user-menu-container">
            <button
              className="auth-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label="Account menu"
            >
              <FaUser style={{ fontSize: "11px" }} /> Account
            </button>
            {showUserMenu && (
              <div className="dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate("/profile");
                  }}
                >
                  <FaUser /> My Profile
                </button>

                <button className="dropdown-item" onClick={handleLogout}>
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="nav-left">
            <Link to="/outfit-predictor" className="logo-link">
              <h1 className="logo">TRYMI</h1>
            </Link>
            <ul className="nav-menu">
              <li>
                <Link to="/collections" className="nav-link-active">
                  Collections
                </Link>
              </li>

              <li style={{ position: "relative" }}>
                <span
                  onClick={handleStudioClick}
                  className="nav-link"
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleStudioClick(e);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  Studio
                  <span
                    style={{
                      position: "absolute",
                      top: "-12px",
                      right: "-15px",
                      color: "#FF4444",
                      fontSize: "12px",
                      animation:
                        "navBounce 0.8s infinite alternate ease-in-out",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <FaFire />
                  </span>
                </span>
              </li>
              {/* ✅ KEPT: 3D Avatar Virtual Try-On */}
              <li>
                <span
                  onClick={handleVirtualTryClick}
                  className="nav-link"
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleVirtualTryClick(e);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  3D Virtual Try
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
            <button
              className="icon-btn"
              aria-label="Wishlist"
              onClick={handleWishlistClick}
            >
              <FaHeart />
            </button>

            <button
              className="icon-btn"
              aria-label="Cart"
              onClick={handleCartClick}
            >
              <FaShoppingCart />
            </button>

            <div className="user-menu-container">
              <button
                className="icon-btn"
                aria-label="Account"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <FaUser />
              </button>
              {showUserMenu && (
                <div className="dropdown-menu" style={{ right: "-8px" }}>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate("/profile");
                    }}
                  >
                    <FaUser /> My Profile
                  </button>

                  <button className="dropdown-item" onClick={handleLogout}>
                    <FaSignOutAlt /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className="hero-section"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`hero-container ${isVisible ? "visible" : "hidden"}`}>
          <div className="hero-content">
            <div className="text-content">
              <span className="collection-tag">{slides[currentSlide].tag}</span>
              <h1 className="hero-title">{slides[currentSlide].title}</h1>
              <h2 className="hero-subtitle">{slides[currentSlide].subtitle}</h2>
              <p className="hero-description">
                {slides[currentSlide].description}
              </p>
              <div className="cta-group">
                <button
                  className="shop-btn"
                  onClick={() => handleHeroCtaClick(slides[currentSlide].cta)}
                >
                  {slides[currentSlide].cta}
                </button>
                <a href="#featured" className="text-link">
                  View Details
                </a>
              </div>
            </div>
            <div className="image-content">
              <img
                src={slides[currentSlide].image}
                alt={`${slides[currentSlide].title} ${slides[currentSlide].subtitle}`}
                className="hero-image"
                width="580"
                height="700"
                loading="eager"
                decoding="async"
                fetchpriority="high"
              />
            </div>

          </div>

          {isAutoPlaying && (
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${((currentSlide + 1) / slides.length) * 100}%`,
                }}
              />
            </div>
          )}

          <div className="slide-indicators">
            <div className="indicator-wrapper">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`indicator ${currentSlide === index ? "indicator-active" : ""
                    }`}
                  onClick={() => handleSlideClick(index)}
                  role="button"
                  aria-label={`Go to slide ${index + 1}`}
                  tabIndex={0}
                />
              ))}
            </div>
            <span className="slide-counter">
              {String(currentSlide + 1).padStart(2, "0")} /{" "}
              {String(slides.length).padStart(2, "0")}
            </span>
          </div>

          <div className="navigation-arrows">
            <button
              className="arrow-btn"
              aria-label="Previous slide"
              onClick={handlePrevSlide}
            >
              ←
            </button>
            <button
              className="arrow-btn"
              aria-label="Next slide"
              onClick={handleNextSlide}
            >
              →
            </button>
          </div>
        </div>
      </section>

      {/* ✅ NEW: Studio Feature Banner */}
      <section
        id="studio-banner"
        className={`studio-banner ${revealedSections.has("studio-banner") ? "reveal" : "hide"}`}
      >
        <div className="studio-banner-content">
          <div className="studio-banner-text">
            <h2>Try Before You Buy</h2>
            <p>
              Experience our AI-powered virtual try-on. Upload your photo and
              see how any outfit looks on you instantly.
            </p>
            <button className="studio-cta-btn" onClick={handleStudioClick}>
              Launch AI Studio →
            </button>
          </div>
          <div className="studio-banner-image">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop&q=80"
              alt="AI Virtual Try-On Studio"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ✅ Empty State - Show when no wishlist or cart items */}
      {(!productCollections.women || productCollections.women.length === 0) &&
        (!productCollections.men || productCollections.men.length === 0) &&
        (!productCollections.kids || productCollections.kids.length === 0) &&
        (!productCollections.other ||
          productCollections.other.length === 0) && (
          <section
            className="empty-state-section"
            style={{
              padding: "120px 60px",
              textAlign: "center",
              backgroundColor: "#FAFAFA",
              minHeight: "60vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              className="empty-state-content"
              style={{
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              <div
                className="empty-state-icon"
                style={{
                  fontSize: "80px",
                  marginBottom: "30px",
                  animation: "float 3s ease-in-out infinite",
                }}
              >
                💝
              </div>
              <h2
                className="empty-state-title"
                style={{
                  fontSize: "36px",
                  fontWeight: "300",
                  marginBottom: "20px",
                  color: "#000",
                }}
              >
                Your Wishlist is Empty
              </h2>
              <p
                className="empty-state-text"
                style={{
                  fontSize: "16px",
                  color: "#666",
                  lineHeight: "1.8",
                  marginBottom: "40px",
                }}
              >
                Start building your dream wardrobe! Browse our collections and
                add products to your wishlist or cart.
              </p>
              <div
                className="empty-state-actions"
                style={{
                  display: "flex",
                  gap: "20px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="shop-btn"
                  onClick={() => navigate("/collections")}
                  style={{
                    padding: "15px 40px",
                    fontSize: "14px",
                    letterSpacing: "2px",
                  }}
                >
                  Explore Collections →
                </button>
                <button
                  className="shop-btn"
                  onClick={handleStudioClick}
                  style={{
                    padding: "15px 40px",
                    fontSize: "14px",
                    background: "transparent",
                    color: "#000",
                    border: "1px solid #000",
                    letterSpacing: "2px",
                  }}
                >
                  Try AI Studio
                </button>
              </div>
            </div>
          </section>
        )}

      {/* Product Sections - Show Your Wishlist & Cart Items */}
      {((productCollections.women && productCollections.women.length > 0) ||
        (productCollections.men && productCollections.men.length > 0) ||
        (productCollections.kids && productCollections.kids.length > 0) ||
        (productCollections.other && productCollections.other.length > 0)) && (
          <>
            <div
              className="products-header"
              style={{
                textAlign: "center",
                padding: "80px 60px 40px",
                backgroundColor: "#FAFAFA",
              }}
            >
              <h2
                className="products-main-title"
                style={{
                  fontSize: "48px",
                  fontWeight: "300",
                  marginBottom: "15px",
                  color: "#000",
                }}
              >
                Your Wishlist & Cart
              </h2>
              <p
                className="products-subtitle"
                style={{
                  fontSize: "14px",
                  color: "#666",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                }}
              >
                Items you've saved for later
              </p>
            </div>
            {renderProductSection(
              "women",
              "Women's Favorites",
              "/collections/women",
            )}
            {renderProductSection("men", "Men's Picks", "/collections/men")}
            {renderProductSection(
              "kids",
              "Kids' Selections",
              "/collections/kids",
            )}
            {renderProductSection("other", "Other Favorites", "/collections")}
          </>
        )}

      {/* Featured Section */}
      <section id="featured" className="featured-section">
        <h2 className="section-title">Our Commitment</h2>
        <div className="featured-grid">
          <div className="featured-item">
            <h3 className="featured-title">Complimentary Delivery</h3>
            <p className="featured-text">
              Enjoy complimentary standard delivery on all orders
            </p>
          </div>
          <div className="featured-item">
            <h3 className="featured-title">Personalized Service</h3>
            <p className="featured-text">
              Experience bespoke styling and tailored recommendations
            </p>
          </div>
          <div className="featured-item">
            <h3 className="featured-title">Exceptional Quality</h3>
            <p className="featured-text">
              Every piece crafted with meticulous attention to detail
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OutfitPredictor;


