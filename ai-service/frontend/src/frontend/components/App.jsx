import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Box, VStack, Text } from "@chakra-ui/react";

// WebGLErrorBoundary - at project root
import WebGLErrorBoundary from "@core/WebGLErrorBoundary.jsx";

// ✅ ChatBot Component
import ChatBot from "./ChatBot.jsx";

// ✅ NEW: Studio CSS Import
import "../styles/studio.css";
import AtelierLoader from "@core/AtelierLoader.jsx";

// All existing components
const HomePage = React.lazy(() => import("./outfitpredicter.jsx"));
const SignupPage = React.lazy(() => import("./signup_trymi.jsx"));
const LoginPage = React.lazy(() => import("./TRYMI_login.jsx"));
const AdminDashboard = React.lazy(() => import("./AdminDashboard.jsx"));
const VirtualTryOnPage = React.lazy(() => import("./AvatarCustomizer.jsx"));
const AboutPage = React.lazy(() => import("./TRYMI_about.jsx"));
const CollectionsPage = React.lazy(() => import("./collections.jsx"));
const CartPage = React.lazy(() => import("./Cart.jsx"));
const WishlistPage = React.lazy(() => import("./Wishlist.jsx"));
const UserProfilePage = React.lazy(() => import("./UserProfile.jsx"));
const ForgotPasswordPage = React.lazy(() => import("./forget_password.jsx"));
const AvatarSelectionPage = React.lazy(
  () => import("./AvatarSelectionPage.jsx"),
);

// These assume Studio is a subfolder in the same directory as App.jsx
const StudioLanding = React.lazy(() => import("./Studio/StudioLanding"));
const PhotoUpload = React.lazy(() => import("./Studio/PhotoUpload"));
const ClothingSelector = React.lazy(() => import("./Studio/ClothingSelector"));
const TryOnResult = React.lazy(() => import("./Studio/TryOnResult"));
const MyLooks = React.lazy(() => import("./Studio/MyLooks"));
// Loading Fallback - Styled to match Studio Theme
const LoadingFallback = () => <AtelierLoader />;

// Error Boundary for Lazy Loading
class LazyLoadErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Lazy loading error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          bg="#1a1a1a"
          minH="100vh"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <VStack spacing={4}>
            <Text color="red.400" fontSize="xl" fontWeight="bold">
              ⚠️ Failed to load page
            </Text>
            <Text color="gray.400">
              Please refresh the page or contact support
            </Text>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Protected Route - Fixed to prevent double logging
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
  const location = useLocation();

  if (!isAuthenticated) {
    console.log("❌ Not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Global styles
const globalStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes navBounce {
    0% { transform: translateY(0) scale(1); }
    100% { transform: translateY(-3px) scale(1.1); }
  }
`;

// ✅ Login Page and SignupPage are lazy-loaded above.

function App() {
  const location = useLocation();

  // ✅ Define pages where chatbot should be hidden
  const hideChatbotPaths = [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/admin",
    "/studio/upload",
    "/studio/select-clothing",
    "/studio/result",
  ];
  const shouldShowChatbot = !hideChatbotPaths.includes(location.pathname);

  // Debug logging for route changes
  useEffect(() => {
    console.log("📍 App Route changed to:", location.pathname);
  }, [location.pathname]);

  console.log("🏗️ App Rendering:", location.pathname);

  // ✅ Initialize & Sync Wishlist
  useEffect(() => {
    const syncWishlist = async () => {
      try {
        const module = await import("../../store/wishlistStore");
        const useWishlistStore = module.default;
        await useWishlistStore.getState().fetchUserWishlist();
      } catch (err) {
        console.error("Failed to sync wishlist in App:", err);
      }
    };

    syncWishlist();

    // Re-sync if user logs in/out in another tab or through storage changes
    window.addEventListener("storage", (e) => {
      if (e.key === "isAuthenticated" || e.key === "user") {
        syncWishlist();
      }
    });

    return () => window.removeEventListener("storage", syncWishlist);
  }, []);

  return (
    <>
      <style>{globalStyles}</style>
      <React.Suspense fallback={<LoadingFallback />}>
        <LazyLoadErrorBoundary>
          <Routes>
            {/* ============================================ */}
            {/* PUBLIC ROUTES */}
            {/* ============================================ */}
            {/* ✅ Root - Route based on authentication state */}
            <Route
              path="/"
              element={(() => {
                const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
                const user = localStorage.getItem("user");

                // CRITICAL: Only allow entry to dashboard if both authenticated AND user exists
                if (isAuthenticated && user && user !== "null" && user !== "undefined") {
                  return <Navigate to="/outfit-predictor" replace />;
                }

                // For all other cases (new user, logged out, or incomplete data), show Signup
                return <SignupPage />;
              })()}
            />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/about" element={<AboutPage />} />

            {/* ============================================ */}
            {/* ADMIN ROUTES */}
            {/* ============================================ */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* ============================================ */}
            {/* OUTFIT PREDICTOR ROUTES */}
            {/* ============================================ */}
            <Route
              path="/outfit-predictor"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />

            {/* ============================================ */}
            {/* VIRTUAL TRY-ON ROUTES (3D Avatar) */}
            {/* ============================================ */}
            <Route
              path="/virtual-try-on"
              element={
                <ProtectedRoute>
                  <WebGLErrorBoundary>
                    <VirtualTryOnPage />
                  </WebGLErrorBoundary>
                </ProtectedRoute>
              }
            />

            <Route
              path="/avatar-selection"
              element={
                <ProtectedRoute>
                  <WebGLErrorBoundary>
                    <AvatarSelectionPage />
                  </WebGLErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* Redirect old paths */}
            <Route
              path="/select-avatar"
              element={<Navigate to="/avatar-selection" replace />}
            />
            <Route
              path="/virtual-tryon"
              element={<Navigate to="/virtual-try-on" replace />}
            />
            <Route
              path="/virtual-try"
              element={<Navigate to="/virtual-try-on" replace />}
            />

            {/* ============================================ */}
            {/* ✅ STUDIO ROUTES (AI Virtual Try-On) */}
            {/* ============================================ */}
            <Route
              path="/studio"
              element={
                <ProtectedRoute>
                  <StudioLanding />
                </ProtectedRoute>
              }
            />

            <Route
              path="/studio/upload"
              element={
                <ProtectedRoute>
                  <PhotoUpload />
                </ProtectedRoute>
              }
            />

            <Route
              path="/studio/select-clothing"
              element={
                <ProtectedRoute>
                  <ClothingSelector />
                </ProtectedRoute>
              }
            />

            <Route
              path="/studio/result"
              element={
                <ProtectedRoute>
                  <TryOnResult />
                </ProtectedRoute>
              }
            />

            <Route
              path="/studio/my-looks"
              element={
                <ProtectedRoute>
                  <MyLooks />
                </ProtectedRoute>
              }
            />

            {/* Alternative Studio paths */}
            <Route
              path="/ready-to-wear"
              element={<Navigate to="/studio" replace />}
            />
            <Route
              path="/ai-tryon"
              element={<Navigate to="/studio" replace />}
            />

            {/* ============================================ */}
            {/* SHOPPING ROUTES */}
            {/* ============================================ */}
            <Route
              path="/collections/:category?"
              element={
                <ProtectedRoute>
                  <CollectionsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <CartPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/wishlist"
              element={
                <ProtectedRoute>
                  <WishlistPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfilePage />
                </ProtectedRoute>
              }
            />

            {/* ============================================ */}
            {/* 404 FALLBACK */}
            {/* ============================================ */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </LazyLoadErrorBoundary>

        {/* ✅ AI Chatbot - Shows on all pages except specified paths */}
        {shouldShowChatbot && <ChatBot />}
      </React.Suspense>
    </>
  );
}

export default App;


