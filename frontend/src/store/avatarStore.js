import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAvatarStore = create(
  persist(
    (set, get) => ({
      // ✅ ENHANCED: Avatar customization state (OLD + NEW)
      avatar: {
        // OLD: Legacy fields (preserved for backward compatibility)
        skinTone: "#f5d5b8",
        bodyType: "default",
        height: 1.0,
        headShape: "oval",
        eyeColor: "#4a3728",
        hairStyle: "default",
        hairColor: "#2c1810",
      },

      // ✅ NEW: Snapchat/Bitmoji-style customization
      customization: {
        body: "average",
        skin: "medium",
        hair: "short",
        hairColor: "brown",
        eyes: "brown",
        outfit: "casual",
        shoes: "sneakers",
      },

      // ✅ NEW: Gender selection
      selectedGender: "male",

      // ✅ NEW: Saved presets
      savedPresets: [],

      // Current pose
      currentPose: "idle",

      // 3D model references
      skeletonRef: null,

      // ✅ NEW: Applied outfits tracking
      appliedOutfits: [],

      // ✅ OLD: Update single avatar field (legacy)
      updateAvatar: (field, value) =>
        set((state) => ({
          avatar: { ...state.avatar, [field]: value },
        })),

      // ✅ OLD: Update multiple avatar fields (legacy)
      updateMultipleAvatarFields: (updates) =>
        set((state) => ({
          avatar: { ...state.avatar, ...updates },
        })),

      // ✅ NEW: Update customization field
      updateCustomization: (field, value) =>
        set((state) => ({
          customization: { ...state.customization, [field]: value },
        })),

      // ✅ NEW: Update multiple customization fields
      updateMultipleCustomizations: (updates) =>
        set((state) => ({
          customization: { ...state.customization, ...updates },
        })),

      // ✅ NEW: Set entire customization object
      setCustomization: (customization) => set({ customization }),

      // ✅ NEW: Set gender
      setGender: (gender) => {
        set({ selectedGender: gender });
        // Also update localStorage for quick access
        localStorage.setItem("trymi_selected_avatar", gender);
        // Dispatch event for real-time updates
        window.dispatchEvent(new Event("avatar-changed"));
      },

      // ✅ NEW: Save customization as preset
      savePreset: (name) => {
        try {
          const state = get();
          if (!state.selectedGender || !state.customization) {
            console.warn("⚠️ Invalid avatar state for preset");
            return null;
          }

          const preset = {
            id: Date.now().toString(),
            name:
              (name && name.trim()) ||
              `Preset ${state.savedPresets.length + 1}`,
            gender: state.selectedGender,
            customization: { ...state.customization },
            avatar: { ...state.avatar },
            createdAt: new Date().toISOString(),
          };

          set((state) => ({
            savedPresets: [...state.savedPresets, preset],
          }));

          console.log("✅ Preset saved:", preset.name);
          return preset;
        } catch (error) {
          console.error("❌ Error saving preset:", error);
          return null;
        }
      },

      // ✅ NEW: Load preset
      loadPreset: (presetId) => {
        try {
          const state = get();
          if (!presetId) {
            console.warn("⚠️ No preset ID provided");
            return false;
          }

          const preset = state.savedPresets.find((p) => p && p.id === presetId);

          if (preset) {
            set({
              selectedGender: preset.gender || "male",
              customization: { ...preset.customization },
              avatar: { ...preset.avatar },
            });

            localStorage.setItem(
              "trymi_selected_avatar",
              preset.gender || "male",
            );
            localStorage.setItem(
              "trymi_avatar_customization",
              JSON.stringify(preset.customization),
            );

            window.dispatchEvent(new Event("avatar-changed"));
            console.log("✅ Preset loaded:", preset.name);
            return true;
          }

          console.warn("⚠️ Preset not found:", presetId);
          return false;
        } catch (error) {
          console.error("❌ Error loading preset:", error);
          return false;
        }
      },

      // ✅ NEW: Delete preset
      deletePreset: (presetId) => {
        try {
          if (!presetId) {
            console.warn("⚠️ No preset ID provided");
            return false;
          }
          set((state) => ({
            savedPresets: state.savedPresets.filter(
              (p) => p && p.id !== presetId,
            ),
          }));
          console.log("✅ Preset deleted");
          return true;
        } catch (error) {
          console.error("❌ Error deleting preset:", error);
          return false;
        }
      },

      // ✅ NEW: Rename preset
      renamePreset: (presetId, newName) => {
        try {
          if (!presetId || !newName || !newName.trim()) {
            console.warn("⚠️ Invalid preset ID or name");
            return false;
          }
          set((state) => ({
            savedPresets: state.savedPresets.map((p) =>
              p && p.id === presetId ? { ...p, name: newName.trim() } : p,
            ),
          }));
          console.log("✅ Preset renamed");
          return true;
        } catch (error) {
          console.error("❌ Error renaming preset:", error);
          return false;
        }
      },

      // ✅ NEW: Export customization as JSON
      exportCustomization: () => {
        const state = get();
        return {
          version: "1.0",
          gender: state.selectedGender,
          customization: state.customization,
          avatar: state.avatar,
          exportedAt: new Date().toISOString(),
        };
      },

      // ✅ NEW: Import customization from JSON
      importCustomization: (data) => {
        try {
          if (data.version && data.customization) {
            set({
              selectedGender: data.gender || "male",
              customization: { ...data.customization },
              avatar: data.avatar || get().avatar,
            });

            // Update localStorage
            localStorage.setItem(
              "trymi_selected_avatar",
              data.gender || "male",
            );
            localStorage.setItem(
              "trymi_avatar_customization",
              JSON.stringify(data.customization),
            );

            window.dispatchEvent(new Event("avatar-changed"));

            return true;
          }
          return false;
        } catch (error) {
          console.error("Failed to import customization:", error);
          return false;
        }
      },

      // ✅ NEW: Reset customization to default
      resetCustomization: () =>
        set({
          customization: {
            body: "average",
            skin: "medium",
            hair: "short",
            hairColor: "brown",
            eyes: "brown",
            outfit: "casual",
            shoes: "sneakers",
          },
        }),

      // ✅ OLD: Reset avatar (legacy)
      resetAvatar: () =>
        set({
          avatar: {
            skinTone: "#f5d5b8",
            bodyType: "default",
            height: 1.0,
            headShape: "oval",
            eyeColor: "#4a3728",
            hairStyle: "default",
            hairColor: "#2c1810",
          },
        }),

      // ✅ NEW: Reset everything
      resetAll: () =>
        set({
          avatar: {
            skinTone: "#f5d5b8",
            bodyType: "default",
            height: 1.0,
            headShape: "oval",
            eyeColor: "#4a3728",
            hairStyle: "default",
            hairColor: "#2c1810",
          },
          customization: {
            body: "average",
            skin: "medium",
            hair: "short",
            hairColor: "brown",
            eyes: "brown",
            outfit: "casual",
            shoes: "sneakers",
          },
          selectedGender: "male",
          currentPose: "idle",
          appliedOutfits: [],
        }),

      // ✅ OLD: Set current pose
      setCurrentPose: (pose) => set({ currentPose: pose }),

      // ✅ OLD: Set skeleton reference
      setSkeletonRef: (ref) => set({ skeletonRef: ref }),

      // ✅ NEW: Track applied outfits
      addAppliedOutfit: (outfit) =>
        set((state) => ({
          appliedOutfits: [...state.appliedOutfits, outfit],
        })),

      removeAppliedOutfit: (outfitId) =>
        set((state) => ({
          appliedOutfits: state.appliedOutfits.filter((o) => o.id !== outfitId),
        })),

      clearAppliedOutfits: () => set({ appliedOutfits: [] }),

      // ✅ NEW: Sync with localStorage
      syncWithLocalStorage: () => {
        const savedGender = localStorage.getItem("trymi_selected_avatar");
        const savedCustomization = localStorage.getItem(
          "trymi_avatar_customization",
        );

        const updates = {};

        if (savedGender) {
          updates.selectedGender = savedGender;
        }

        if (savedCustomization) {
          try {
            updates.customization = JSON.parse(savedCustomization);
          } catch (e) {
            console.error("Failed to parse saved customization:", e);
          }
        }

        if (Object.keys(updates).length > 0) {
          set(updates);
        }
      },

      // ✅ NEW: Get customization for RealisticAvatar
      getCustomizationForAvatar: () => {
        const state = get();
        return {
          ...state.customization,
          // Legacy support - map new fields to old if needed
          skinTone: state.avatar.skinTone,
          eyeColor: state.avatar.eyeColor,
        };
      },

      // ✅ OLD: Getters (preserved)
      getAvatar: () => get().avatar,
      getSkeleton: () => get().skeletonRef,
      getCustomization: () => get().customization,
      getGender: () => get().selectedGender,
      getPresets: () => get().savedPresets,
    }),
    {
      name: "trymi-avatar-storage", // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        avatar: state.avatar,
        customization: state.customization,
        selectedGender: state.selectedGender,
        savedPresets: state.savedPresets,
        currentPose: state.currentPose,
      }),
    },
  ),
);

// ✅ NEW: Initialize store on app load
if (typeof window !== "undefined") {
  // Sync with localStorage on mount
  useAvatarStore.getState().syncWithLocalStorage();

  // Listen for storage events (multi-tab support)
  window.addEventListener("storage", (e) => {
    if (
      e.key === "trymi_selected_avatar" ||
      e.key === "trymi_avatar_customization"
    ) {
      useAvatarStore.getState().syncWithLocalStorage();
    }
  });
}

export default useAvatarStore;
