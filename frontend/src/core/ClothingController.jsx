import React, { useEffect, useRef, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import useClothingStore from "../State Management/clothingStore";
import useAvatarStore from "../State Management/avatarStore";
import {
  applyGarmentToSkeleton,
  processGarmentMaterial,
} from "../Utility Functions/garmentProcessor";

// ✅ Inner component for rendering individual clothing items
const ClothingItemMesh = ({ clothingData, skeleton }) => {
  const meshRef = useRef();

  // ✅ Input validation
  if (!clothingData || !clothingData.modelUrl) {
    console.warn("⚠️ Invalid clothingData provided to ClothingItemMesh");
    return null;
  }

  if (!skeleton) {
    console.warn("⚠️ Skeleton reference not available for clothing item");
    return null;
  }

  // ✅ Safe model loading with error handling
  let scene;
  try {
    const gltf = useGLTF(clothingData.modelUrl);
    scene = gltf.scene;
  } catch (error) {
    console.error("❌ Error loading GLTF model:", clothingData.modelUrl, error);
    return null;
  }

  // ✅ Safe scale object validation
  const safeScale = useMemo(() => {
    try {
      if (!clothingData.scale) return { x: 1, y: 1, z: 1 };

      const scale = clothingData.scale;
      return {
        x: typeof scale.x === "number" ? scale.x : 1,
        y: typeof scale.y === "number" ? scale.y : 1,
        z: typeof scale.z === "number" ? scale.z : 1,
      };
    } catch (error) {
      console.error("❌ Error validating scale:", error);
      return { x: 1, y: 1, z: 1 };
    }
  }, [clothingData.scale]);

  useEffect(() => {
    try {
      if (!skeleton || !scene) {
        console.warn("⚠️ Missing skeleton or scene for binding");
        return;
      }

      let meshBound = false;

      scene.traverse((child) => {
        try {
          if (child.isSkinnedMesh) {
            // ✅ Safely bind clothing mesh to avatar skeleton
            if (typeof child.bind === "function") {
              child.bind(skeleton);
              meshBound = true;
            }

            // ✅ Apply material properties safely
            try {
              const material = processGarmentMaterial(clothingData);
              if (material) {
                child.material = material;
              }
            } catch (materialError) {
              console.error(
                "❌ Error processing garment material:",
                materialError,
              );
            }

            // ✅ Apply scale safely
            try {
              child.scale.set(safeScale.x, safeScale.y, safeScale.z);
            } catch (scaleError) {
              console.error("❌ Error applying scale:", scaleError);
            }
          }
        } catch (childError) {
          console.error("❌ Error processing child mesh:", childError);
        }
      });

      if (!meshBound) {
        console.warn(
          "⚠️ No skinned mesh found in model:",
          clothingData.modelUrl,
        );
      }

      console.log(`✅ Clothing item bound successfully: ${clothingData.id}`);
    } catch (error) {
      console.error("❌ Error in ClothingItemMesh effect:", error);
    }
  }, [skeleton, scene, safeScale, clothingData.id, clothingData.modelUrl]);

  return <primitive ref={meshRef} object={scene} />;
};

// ✅ PropTypes for inner component
ClothingItemMesh.propTypes = {
  clothingData: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    modelUrl: PropTypes.string.isRequired,
    scale: PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number,
      z: PropTypes.number,
    }),
  }).isRequired,
  skeleton: PropTypes.object,
};

ClothingItemMesh.defaultProps = {
  skeleton: null,
};

const ClothingController = () => {
  const { outfit } = useClothingStore();
  const { skeletonRef } = useAvatarStore();

  // ✅ Input validation
  if (!skeletonRef) {
    console.warn("⚠️ Skeleton reference not available in ClothingController");
    return null;
  }

  if (!outfit) {
    console.warn("⚠️ No outfit data available");
    return null;
  }

  // ✅ Memoize outfit items to prevent unnecessary re-renders
  const outfitItems = useMemo(() => {
    try {
      const items = [];

      // Add top if available and valid
      if (outfit.top && outfit.top.id && outfit.top.modelUrl) {
        items.push({ type: "top", data: outfit.top });
      }

      // Add bottom if available and valid
      if (outfit.bottom && outfit.bottom.id && outfit.bottom.modelUrl) {
        items.push({ type: "bottom", data: outfit.bottom });
      }

      // Add shoes if available and valid
      if (outfit.shoes && outfit.shoes.id && outfit.shoes.modelUrl) {
        items.push({ type: "shoes", data: outfit.shoes });
      }

      // Add accessories if available and valid
      if (Array.isArray(outfit.accessories)) {
        outfit.accessories.forEach((accessory) => {
          if (accessory && accessory.id && accessory.modelUrl) {
            items.push({ type: "accessory", data: accessory });
          }
        });
      }

      return items;
    } catch (error) {
      console.error("❌ Error validating outfit items:", error);
      return [];
    }
  }, [outfit]);

  // ✅ Handle case where no valid items exist
  if (outfitItems.length === 0) {
    console.log("ℹ️ No valid clothing items to render");
    return null;
  }

  return (
    <group name="clothing-group" userData={{ type: "clothingController" }}>
      {outfitItems.map((item) => (
        <ClothingItemMesh
          key={`${item.type}-${item.data.id}`}
          clothingData={item.data}
          skeleton={skeletonRef}
        />
      ))}
    </group>
  );
};

export default React.memo(ClothingController);
