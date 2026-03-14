import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import API_BASE_URL from "../config/api";

// Helper to get User ID
const getUserId = () => {
  const possibleKeys = ["userId", "user", "trymi_user", "currentUser", "authUser", "userEmail"];
  for (const key of possibleKeys) {
    const data = localStorage.getItem(key);
    if (!data) continue;
    try {
      if (key === "userId" || key === "userEmail") return data;
      const parsed = JSON.parse(data);
      if (parsed) return parsed._id || parsed.id || parsed.uid || parsed.email;
    } catch (e) {
      if (typeof data === "string" && data.length > 5) return data;
    }
  }
  return null;
}

const useWishlistStore = create(
  persist(
    (set, get) => ({
      wishlist: [],

      // ✅ Fetch from Backend (Call this on App load / Login)
      fetchUserWishlist: async () => {
        const userId = getUserId();
        if (!userId) {
          console.log("ℹ️ No User ID found, skipping wishlist sync");
          return;
        }

        try {
          console.log("🔄 Fetching wishlist for user:", userId);
          const response = await axios.get(`${API_BASE_URL}/api/wishlist/${userId}`);

          if (response.data && response.data.wishlist) {
            const remoteWishlist = response.data.wishlist;
            console.log("✅ Wishlist synced from DB:", remoteWishlist.length, "items");

            // SERVER WINS STRATEGY:
            // We overwrite local with remote to ensure deleted items are removed.
            // Local state is only preserved if this fetch FAILS (caught in catch block).
            set({ wishlist: remoteWishlist });
          }
        } catch (error) {
          console.error("❌ Failed to fetch wishlist from DB:", error);
        }
      },

      addToWishlist: async (product) => {
        const { wishlist } = get();
        try {
          if (!product || !product._id) {
            console.warn("⚠️ Invalid product for wishlist:", product);
            return;
          }

          // Flexible duplicate check
          const exists = wishlist.some(item => {
            const itemId = (item._id || item.id || (item.productId && (item.productId._id || item.productId))).toString();
            const prodId = (product._id || product.id).toString();
            return itemId === prodId;
          });

          if (exists) {
            console.log("💝 Item already in wishlist (client-side check)");
            return;
          }

          // Optimistic Update
          set({ wishlist: [...wishlist, product] });
          console.log("✅ Added to wishlist (Optimistic):", product.name || product.title);

          // Backend Sync
          const userId = getUserId();
          if (userId) {
            await axios.post(`${API_BASE_URL}/api/wishlist/add`, {
              userId,
              productId: product._id
            });
            console.log("✅ Synced add to DB");
          }
        } catch (error) {
          if (
            error.response?.status === 400 &&
            error.response?.data?.message === "Product already in wishlist"
          ) {
            console.log("ℹ️ Product already exists in DB – ignoring.");
            return;
          }

          console.error("❌ Error adding to wishlist:", error);
          // Optional: rollback optimistic update on real error
        }
      },

      removeFromWishlist: async (productId) => {
        const { wishlist } = get();
        try {
          if (!productId) {
            console.warn("⚠️ Invalid product ID for removal");
            return;
          }

          // Optimistic Update
          set({ wishlist: wishlist.filter(item => item._id !== productId && item.id !== productId) });
          console.log("🗑️ Removed from wishlist (Optimistic)");

          // Backend Sync
          const userId = getUserId();
          if (userId) {
            await axios.post(`${API_BASE_URL}/api/wishlist/remove`, {
              userId,
              productId
            });
            console.log("✅ Synced removal with DB");
          }
        } catch (error) {
          console.error("❌ Error removing from wishlist:", error);
          if (error.response && error.response.data) {
            console.error("📦 Server error details:", error.response.data);
          }
        }
      },

      clearWishlist: async () => {
        set({ wishlist: [] });
        const userId = getUserId();
        if (userId) {
          try {
            await axios.delete(`${API_BASE_URL}/api/wishlist/clear/${userId}`);
            console.log("✅ Wishlist cleared in DB");
          } catch (error) {
            console.error("❌ Failed to clear wishlist DB:", error);
          }
        }
      },

      isInWishlist: (productId) => {
        if (!productId) return false;
        const { wishlist } = get();
        const searchId = productId.toString();

        return wishlist.some(item => {
          const itemId = (item._id || item.id).toString();
          if (itemId === searchId) return true;

          // Legacy or complex format support
          if (item.productId) {
            const nestedId = (item.productId._id || item.productId).toString();
            if (nestedId === searchId) return true;
          }
          return false;
        });
      },

      getWishlistCount: () => get().wishlist.length,

      // Handle raw updates (from other components)
      setWishlist: (items) => {
        if (Array.isArray(items)) {
          set({ wishlist: items });
        }
      }
    }),
    {
      name: "trymi_wishlist",
      version: 1,
    }
  )
);

export default useWishlistStore;


