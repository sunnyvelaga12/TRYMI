const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://trymi-backend.onrender.com';

export const API_ENDPOINTS = {
  // Collections
  COLLECTIONS: `${API_BASE_URL}/api/collections`,
  COLLECTIONS_BY_CATEGORY: (category) => `${API_BASE_URL}/api/collections/${category}`,
  HEALTH: `${API_BASE_URL}/api/health`,
  PRODUCT_BY_ID: (id) => `${API_BASE_URL}/api/products/${id}`,

  // Wishlist
  WISHLIST: (userId) => `${API_BASE_URL}/api/wishlist/${userId}`,
  WISHLIST_ADD: `${API_BASE_URL}/api/wishlist/add`,
  WISHLIST_REMOVE: `${API_BASE_URL}/api/wishlist/remove`,
  WISHLIST_CLEAR: (userId) => `${API_BASE_URL}/api/wishlist/clear/${userId}`,

  // Cart
  CART_ADD: `${API_BASE_URL}/api/cart/add`,
  CART_REMOVE: `${API_BASE_URL}/api/cart/remove`,                        // ✅ Added
  CART: (userId) => `${API_BASE_URL}/api/cart/${userId}`,                // ✅ Added
  CART_CLEAR: (userId) => `${API_BASE_URL}/api/cart/clear/${userId}`,    // ✅ Added

  // Auth
  AUTH_LOGIN: `${API_BASE_URL}/api/auth/login`,                          // ✅ Added
  AUTH_SIGNUP: `${API_BASE_URL}/api/auth/signup`,
  AUTH_SEND_OTP: `${API_BASE_URL}/api/auth/send-otp`,
  AUTH_VERIFY_OTP: `${API_BASE_URL}/api/auth/verify-otp`,
  AUTH_RESET_PASSWORD: `${API_BASE_URL}/api/auth/reset-password`,

  // Profile
  PROFILE: (userId) => `${API_BASE_URL}/api/profile/${userId}`,          // ✅ Added
  PROFILE_PREFERENCES: (userId) => `${API_BASE_URL}/api/profile/${userId}/preferences`, // ✅ Added

  // Studio
  STUDIO_UPLOAD: `${API_BASE_URL}/api/studio/upload-photo`,
  STUDIO_UPLOAD_CLOTHING: `${API_BASE_URL}/api/studio/upload-clothing`,  // ✅ Added
  STUDIO_GENERATE: `${API_BASE_URL}/api/studio/generate-tryon`,
  STUDIO_MY_LOOKS: (userId) => `${API_BASE_URL}/api/studio/my-looks/${userId}`,
  STUDIO_RESULT: (resultId) => `${API_BASE_URL}/api/studio/result/${resultId}`,
  STUDIO_SAVE_LOOK: `${API_BASE_URL}/api/studio/save-look`,
  STUDIO_DELETE_LOOK: (resultId) => `${API_BASE_URL}/api/studio/delete-look/${resultId}`,

  // Chatbot
  CHATBOT: `${API_BASE_URL}/api/chatbot/chat`,
  CHATBOT_RECOMMEND: `${API_BASE_URL}/api/chatbot/recommend`,            // ✅ Added
  CHATBOT_HISTORY: (userId) => `${API_BASE_URL}/api/chatbot/history/${userId}`, // ✅ Added

  // Feedback
  FEEDBACK: `${API_BASE_URL}/api/feedback`,                              // ✅ Added
  FEEDBACK_USER: (userId) => `${API_BASE_URL}/api/feedback/user/${userId}`, // ✅ Added

  // AI Service status
  AI_STATUS: `${API_BASE_URL}/api/ai-status`,                            // ✅ Added
  AI_QUOTA: `${API_BASE_URL}/api/quota-status`,                          // ✅ Added
};

export default API_BASE_URL;
// force rebuild 


