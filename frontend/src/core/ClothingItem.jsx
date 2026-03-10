import React, { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { Box, Image, Badge, Text, Skeleton } from "@chakra-ui/react";
import useClothingStore from "../State Management/clothingStore";

const ClothingItem = ({ item, category, onError = null }) => {
  const { selectClothingItem, outfit } = useClothingStore();

  // ✅ Input validation
  if (!item || !item.id) {
    console.error("❌ ClothingItem: Invalid item prop", { item, category });
    return null;
  }

  if (!category || typeof category !== "string") {
    console.error("❌ ClothingItem: Invalid category prop", { category });
    return null;
  }

  // ✅ Memoized selection check
  const isSelected = useMemo(() => {
    try {
      return outfit && outfit[category]?.id === item.id;
    } catch (error) {
      console.error("❌ Error checking selection:", error);
      return false;
    }
  }, [outfit, category, item.id]);

  // ✅ Safe thumbnail getter with fallback
  const itemThumbnail = useMemo(() => {
    try {
      if (!item.thumbnail || typeof item.thumbnail !== "string") {
        console.warn("⚠️ Invalid thumbnail URL for item:", item.id);
        return "https://via.placeholder.com/300?text=No+Image";
      }
      return item.thumbnail;
    } catch (error) {
      console.error("❌ Error getting thumbnail:", error);
      return "https://via.placeholder.com/300?text=Error";
    }
  }, [item.thumbnail, item.id]);

  // ✅ Safe item name with fallback
  const itemName = useMemo(() => {
    try {
      const name = item.name || "Unnamed Item";
      return String(name).trim();
    } catch (error) {
      console.error("❌ Error getting item name:", error);
      return "Item";
    }
  }, [item.name]);

  // ✅ Safe price formatting
  const formattedPrice = useMemo(() => {
    try {
      if (!item.price) return null;
      const price = parseFloat(item.price);
      if (isNaN(price)) {
        console.warn("⚠️ Invalid price value:", item.price);
        return null;
      }
      return `$${price.toFixed(2)}`;
    } catch (error) {
      console.error("❌ Error formatting price:", error);
      return null;
    }
  }, [item.price]);

  // ✅ Memoized click handler with error boundary
  const handleClick = useCallback(() => {
    try {
      if (!selectClothingItem || typeof selectClothingItem !== "function") {
        throw new Error("selectClothingItem is not a valid function");
      }

      selectClothingItem(category, item);
      console.log(`✅ Selected ${itemName} in ${category}`);
    } catch (error) {
      console.error("❌ Error selecting clothing item:", error);
      if (onError && typeof onError === "function") {
        onError(error);
      }
    }
  }, [selectClothingItem, category, item, itemName, onError]);

  // ✅ Error handler for image loading failures
  const handleImageError = useCallback(
    (e) => {
      try {
        console.warn("⚠️ Failed to load image for item:", item.id);
        // Set fallback image
        if (e.target) {
          e.target.src = "https://via.placeholder.com/300?text=Image+Failed";
        }
      } catch (error) {
        console.error("❌ Error handling image error:", error);
      }
    },
    [item.id],
  );

  // ✅ Keyboard accessibility
  const handleKeyDown = useCallback(
    (e) => {
      try {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      } catch (error) {
        console.error("❌ Error in keyboard handler:", error);
      }
    },
    [handleClick],
  );

  return (
    <Box
      position="relative"
      cursor="pointer"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Select ${itemName} for ${category}`}
      aria-pressed={isSelected}
      borderRadius="lg"
      overflow="hidden"
      border={isSelected ? "3px solid #00ff00" : "2px solid transparent"}
      transition="all 0.2s ease-in-out"
      _hover={{
        transform: "scale(1.05)",
        boxShadow: "lg",
        borderColor: isSelected ? "#00ff00" : "#666",
      }}
      _focus={{
        outline: "2px solid #00ff00",
        outlineOffset: "2px",
      }}
      _active={{
        transform: "scale(0.98)",
      }}
      bg="gray.900"
      data-testid={`clothing-item-${item.id}`}
    >
      <Image
        src={itemThumbnail}
        alt={itemName}
        width="100%"
        height="120px"
        objectFit="cover"
        onError={handleImageError}
        loading="lazy"
        fallback={<Skeleton width="100%" height="120px" />}
      />

      {isSelected && (
        <Badge
          position="absolute"
          top="5px"
          right="5px"
          colorScheme="green"
          aria-label="Item is selected"
        >
          ✓ Selected
        </Badge>
      )}

      <Box p={2} bg="gray.800">
        <Text
          fontSize="sm"
          color="white"
          noOfLines={1}
          fontWeight="500"
          title={itemName}
        >
          {itemName}
        </Text>
        {formattedPrice && (
          <Text fontSize="xs" color="gray.400" fontWeight="500">
            {formattedPrice}
          </Text>
        )}
      </Box>
    </Box>
  );
};

// ✅ PropTypes validation
ClothingItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    thumbnail: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  category: PropTypes.string.isRequired,
  onError: PropTypes.func,
};

// ✅ Default props
ClothingItem.defaultProps = {
  onError: null,
};

export default React.memo(ClothingItem);


