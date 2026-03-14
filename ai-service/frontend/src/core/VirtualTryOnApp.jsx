import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Button,
  Text,
  IconButton,
  Grid,
  Image,
  Badge,
  useToast,
  Slide,
  Spinner,
  Stack,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Divider,
} from "@chakra-ui/react";
import {
  FaTshirt,
  FaHome,
  FaShoppingBag,
  FaHeart,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaCheck,
  FaExchangeAlt,
  FaUser,
  FaRedo,
  FaShoppingCart,
  FaMale,
  FaFemale,
  FaPalette,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import RealisticAvatar from "../components/RealisticAvatar";
import {
  applyOutfitToAvatar,
  resetAvatarToDefault,
  getAllAppliedProducts,
  getAppliedProductsCount,
} from "../utils/avatarOutfitSystem";

console.log("🔥 VirtualTryOnApp.jsx LOADED - Version 3.3 - ALL FIXES");

// Memoized Product Item Component - FIXED
const ProductItem = React.memo(
  ({ product, isSelected, onSelect, onAddToCart }) => {
    console.log("ProductItem render:", product.name, "isSelected:", isSelected);

    return (
      <Box
        position="relative"
        w="100%"
        h="150px"
        bg="gray.800"
        borderRadius="lg"
        overflow="hidden"
        cursor="pointer"
        border={isSelected ? "3px solid" : "2px solid"}
        borderColor={isSelected ? "green.400" : "gray.700"}
        onClick={onSelect}
        _hover={{ transform: "scale(1.03)", borderColor: "green.300" }}
        transition="all 0.2s"
        boxShadow={isSelected ? "lg" : "none"}
      >
        <Image
          src={product.image}
          alt={product.name}
          w="100%"
          h="100%"
          objectFit="cover"
          loading="lazy"
          fallback={
            <Flex align="center" justify="center" h="100%" bg="gray.700">
              <Text fontSize="3xl">{product.emoji || "👕"}</Text>
            </Flex>
          }
        />

        {isSelected && (
          <Box
            position="absolute"
            top={2}
            right={2}
            bg="green.400"
            borderRadius="full"
            p={1.5}
            zIndex={5}
          >
            <FaCheck size={14} color="white" />
          </Box>
        )}

        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          bg="rgba(0,0,0,0.85)"
          backdropFilter="blur(10px)"
          p={2}
        >
          <Text fontSize="xs" fontWeight="bold" noOfLines={1} color="white">
            {product.name}
          </Text>
          <HStack spacing={1} mt={0.5}>
            <Badge colorScheme="green" fontSize="9px">
              {product.category}
            </Badge>
            {product.price && (
              <Text fontSize="10px" color="green.300" fontWeight="semibold">
                {typeof product.price === "number"
                  ? `$${product.price}`
                  : product.price}
              </Text>
            )}
          </HStack>
        </Box>

        {/* Add to Cart Button - CENTERED and visible only when selected */}
        {isSelected && (
          <Flex
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            align="center"
            justify="center"
            bg="rgba(0,0,0,0.3)"
            zIndex={10}
          >
            <Button
              size="md"
              colorScheme="blue"
              leftIcon={<FaShoppingCart />}
              onClick={(e) => {
                e.stopPropagation();
                console.log("Add to Cart clicked for:", product.name);
                onAddToCart(product);
              }}
              fontWeight="bold"
              boxShadow="xl"
            >
              Add to Cart
            </Button>
          </Flex>
        )}
      </Box>
    );
  },
);

// Avatar Scene Component
const AvatarScene = React.memo(({ selectedGender, customization }) => {
  useEffect(() => {
    console.log("✅ Avatar Scene rendering - Gender:", selectedGender);
  }, [selectedGender]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />
      <pointLight position={[0, 2, 0]} intensity={0.2} />

      <RealisticAvatar gender={selectedGender} customization={customization} />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={2}
        maxDistance={8}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
});

import useWishlistStore from "../store/wishlistStore";

const VirtualTryOnApp = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const {
    isOpen: isCustomizeOpen,
    onOpen: onCustomizeOpen,
    onClose: onCustomizeClose,
  } = useDisclosure();

  const { wishlist: wishlistItems } = useWishlistStore();

  const [activeTab, setActiveTab] = useState("fashion");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedGender, setSelectedGender] = useState("male");
  const [panelHeight, setPanelHeight] = useState(380);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isProductPanelOpen, setIsProductPanelOpen] = useState(false);
  const [productPanelHeight] = useState(320);
  const [isAvatarReady, setIsAvatarReady] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  const [customization, setCustomization] = useState({
    skinTone: "#f5c8a0",
    hairColor: "#2c1810",
    shirtColor: "#4a90e2",
    pantsColor: "#2c3e50",
  });

  const [appliedProducts, setAppliedProducts] = useState({
    top: null,
    bottom: null,
    dress: null,
    shoes: null,
    jacket: null,
    bag: null,
  });

  const [wornClothes, setWornClothes] = useState({
    top: null,
    bottom: null,
    dress: null,
    shoes: null,
    jacket: null,
  });

  const [cart, setCart] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);

  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const canvasRef = useRef(null);

  // ✅ Transform wishlist items for the Virtual Try-On format
  const products = useMemo(() => {
    return wishlistItems.map((item) => ({
      id: item._id || item.id,
      name: item.name || item.title,
      category: item.category?.toLowerCase() || "top",
      image: item.image,
      emoji: item.emoji || "👕",
      price: item.price || item.priceRange,
    }));
  }, [wishlistItems]);

  const handleGenderChange = useCallback(
    (newGender) => {
      setSelectedGender(newGender);
      toast({
        title: `Switched to ${newGender} avatar`,
        description: "Your avatar has been updated",
        status: "success",
        duration: 2000,
        isClosable: true,
        position: "top",
      });
    },
    [toast],
  );

  // Load existing cart
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const cartKey = userId ? `trymi_cart_${userId}` : "trymi_cart";
    const storedCart = localStorage.getItem(cartKey);
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart));
      } catch {
        localStorage.removeItem(cartKey);
        setCart([]);
      }
    }
  }, []);

  // Panel drag handlers
  const handleDragStart = useCallback(
    (e) => {
      setIsDragging(true);
      dragStartY.current =
        e.type === "mousedown" ? e.clientY : e.touches[0].clientY;
      dragStartHeight.current = panelHeight;
    },
    [panelHeight],
  );

  const handleDragMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const currentY =
        e.type === "mousemove" ? e.clientY : e.touches[0].clientY;
      const deltaY = dragStartY.current - currentY;
      const newHeight = Math.min(
        Math.max(dragStartHeight.current + deltaY, 180),
        window.innerHeight - 80,
      );
      setPanelHeight(newHeight);
    },
    [isDragging],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const toggleMinimize = useCallback(() => {
    if (isMinimized) {
      setPanelHeight(380);
      setIsMinimized(false);
    } else {
      setPanelHeight(180);
      setIsMinimized(true);
    }
  }, [isMinimized]);

  const handleSnapshot = useCallback(() => {
    toast({
      title: "Snapshot saved!",
      description: "Your outfit has been saved to your closet.",
      status: "success",
      duration: 3000,
      position: "top",
    });
  }, [toast]);

  const updateCustomization = useCallback(
    (key, value) => {
      setCustomization((prev) => ({ ...prev, [key]: value }));
      toast({
        title: "Customization applied",
        description: `${key} updated`,
        status: "success",
        duration: 1000,
        position: "bottom-right",
      });
    },
    [toast],
  );

  // CRITICAL FIX: Apply clothing - DOES NOT CLOSE SLIDE BAR
  const handleClothingSelect = (item) => {
    console.log(
      "🔍 handleClothingSelect called for:",
      item.name,
      "ID:",
      item.id,
    );

    const category = item.category?.toLowerCase();
    const avatarRef = window.avatarRef;

    if (!avatarRef || !avatarRef.current) {
      toast({
        title: "Avatar not ready",
        description: "Please wait for the 3D avatar to load",
        status: "warning",
        duration: 2000,
        position: "bottom",
      });
      return;
    }

    const product = {
      name: item.name,
      category: category,
      image: item.image,
      imageUrl: item.image,
      price: item.price,
      emoji: item.emoji,
      id: item.id,
    };

    const success = applyOutfitToAvatar(product, avatarRef);

    if (success) {
      const normalizedCategory =
        category === "tshirts"
          ? "top"
          : category === "dresses"
            ? "dress"
            : category;

      // Determine if this item is currently applied (so we can know if action will remove it)
      const currentlyApplied = appliedProducts[normalizedCategory];
      const isRemoving = currentlyApplied?.id === item.id;

      if (normalizedCategory === "dress") {
        setAppliedProducts((prev) => ({
          ...prev,
          top: null,
          bottom: null,
          dress: isRemoving ? null : item,
        }));
        setWornClothes((prev) => ({
          ...prev,
          top: null,
          bottom: null,
          dress: isRemoving ? null : item,
        }));
      } else if (
        normalizedCategory === "top" ||
        normalizedCategory === "bottom"
      ) {
        setAppliedProducts((prev) => ({
          ...prev,
          dress: null,
          [normalizedCategory]: isRemoving ? null : item,
        }));
        setWornClothes((prev) => ({
          ...prev,
          dress: null,
          [normalizedCategory]: isRemoving ? null : item,
        }));
      } else {
        setAppliedProducts((prev) => ({
          ...prev,
          [normalizedCategory]: isRemoving ? null : item,
        }));
        setWornClothes((prev) => ({
          ...prev,
          [normalizedCategory]: isRemoving ? null : item,
        }));
      }

      // Update selected item: clear selection if item was removed
      setSelectedItemId(isRemoving ? null : item.id);
      setForceUpdate((prev) => prev + 1);

      toast({
        title: isRemoving ? "Item removed" : "✓ Item fitted",
        description: `${item.name} ${isRemoving ? "removed from" : "applied to"
          } avatar`,
        status: isRemoving ? "info" : "success",
        duration: 2000,
        position: "bottom",
        isClosable: true,
      });

      // SLIDE BAR STAYS OPEN - intentionally not closing the panel
    }
  };

  // Add single item to cart
  const handleAddToCart = (item) => {
    console.log("🛒 Adding to cart:", item.name);

    const existingItemIndex = cart.findIndex(
      (cartItem) => cartItem.id === item.id || cartItem._id === item.id,
    );

    const updatedCart = [...cart];
    if (existingItemIndex > -1) {
      updatedCart[existingItemIndex].quantity =
        (updatedCart[existingItemIndex].quantity || 1) + 1;
    } else {
      updatedCart.push({
        id: item.id,
        _id: item.id,
        name: item.name,
        title: item.name,
        image: item.image,
        price: item.price,
        priceRange: item.price,
        category: item.category,
        quantity: 1,
        addedAt: new Date().toISOString(),
      });
    }

    setCart(updatedCart);
    const userId = localStorage.getItem("userId");
    const cartKey = userId ? `trymi_cart_${userId}` : "trymi_cart";
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cart-updated"));

    toast({
      title: "✅ Added to cart!",
      description: `${item.name} added to your cart`,
      status: "success",
      duration: 3000,
      position: "bottom",
      isClosable: true,
    });

    // CRITICAL: DO NOT CLOSE THE SLIDE BAR
    console.log("✅ Slide bar should stay open after add to cart");
  };

  // Add all items on avatar to cart
  const handleAddAllToCart = useCallback(() => {
    // Read applied products directly from the avatar system to avoid state mismatch
    const itemsToAdd = getAllAppliedProducts();

    if (!itemsToAdd || itemsToAdd.length === 0) {
      toast({
        title: "No items on avatar",
        description: "Please select items from your wishlist first!",
        status: "warning",
        duration: 3000,
        position: "bottom",
        isClosable: true,
      });
      return;
    }

    const updatedCart = [...cart];

    itemsToAdd.forEach((item) => {
      const existingItemIndex = updatedCart.findIndex(
        (cartItem) => cartItem.id === item.id || cartItem._id === item.id,
      );

      if (existingItemIndex > -1) {
        updatedCart[existingItemIndex].quantity =
          (updatedCart[existingItemIndex].quantity || 1) + 1;
      } else {
        updatedCart.push({
          id: item.id,
          _id: item.id,
          name: item.name,
          title: item.name,
          image: item.image,
          price: item.price,
          priceRange: item.price,
          category: item.category,
          quantity: 1,
          addedAt: new Date().toISOString(),
        });
      }
    });

    setCart(updatedCart);
    const userId = localStorage.getItem("userId");
    const cartKey = userId ? `trymi_cart_${userId}` : "trymi_cart";
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cart-updated"));

    toast({
      title: "✅ Added to cart!",
      description: `${itemsToAdd.length} item${itemsToAdd.length > 1 ? "s" : ""
        } added to your cart`,
      status: "success",
      duration: 3000,
      position: "bottom",
      isClosable: true,
    });
  }, [cart, toast]);

  const handleResetAvatar = useCallback(() => {
    const avatarRef = window.avatarRef;

    if (!avatarRef || !avatarRef.current) {
      toast({
        title: "Avatar not ready",
        description: "Please wait for the avatar to load",
        status: "warning",
        duration: 2000,
        position: "bottom",
      });
      return;
    }

    const success = resetAvatarToDefault(avatarRef);

    if (success) {
      setWornClothes({
        top: null,
        bottom: null,
        dress: null,
        shoes: null,
        jacket: null,
      });

      setAppliedProducts({
        top: null,
        bottom: null,
        dress: null,
        shoes: null,
        jacket: null,
        bag: null,
      });

      setSelectedItemId(null);

      toast({
        title: "🔄 Outfit cleared",
        description: "Avatar reset to default state",
        status: "info",
        duration: 2000,
        position: "bottom",
      });
    }
  }, [toast]);

  const filteredProducts =
    activeCategory === "all"
      ? products
      : products.filter((p) => {
        const productCategory = p.category?.toLowerCase();
        const filterCategory = activeCategory.toLowerCase();

        return (
          productCategory === filterCategory ||
          productCategory === filterCategory + "s" ||
          productCategory + "s" === filterCategory
        );
      });

  const isClothingWorn = useCallback(
    (item) => {
      return Object.values(wornClothes).some((worn) => worn?.id === item.id);
    },
    [wornClothes],
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove);
      window.addEventListener("touchend", handleDragEnd);

      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
        window.removeEventListener("touchmove", handleDragMove);
        window.removeEventListener("touchend", handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  const categories = [
    { id: "all", icon: "⚡", label: "All" },
    { id: "tshirts", icon: "👕", label: "T-Shirts" },
    { id: "top", icon: "👕", label: "Tops" },
    { id: "bottom", icon: "👖", label: "Bottoms" },
    { id: "dress", icon: "👗", label: "Dresses" },
    { id: "shoes", icon: "👟", label: "Shoes" },
    { id: "bag", icon: "👜", label: "Bags" },
    { id: "jacket", icon: "🧥", label: "Jackets" },
  ];

  // Use the avatar system's authoritative count (module-level currentOutfit)
  const itemsOnAvatar = getAppliedProductsCount();

  // Debug effect
  useEffect(() => {
    console.log("🔍 selectedItemId changed to:", selectedItemId);
  }, [selectedItemId]);

  return (
    <Box bg="#1a1a1a" minH="100vh" color="white">
      {/* MAIN AVATAR DISPLAY - NO BLUR OR OVERLAY */}
      <Box
        h={`calc(100vh - ${panelHeight}px)`}
        w="100%"
        position="relative"
        bg="linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)"
        transition={isDragging ? "none" : "height 0.3s ease"}
        display="flex"
        alignItems="center"
        justifyContent="center"
      // CRITICAL: NO backdrop filter or overlay here
      >
        <Canvas
          ref={canvasRef}
          camera={{ position: [0, 1, 3], fov: 50 }}
          gl={{
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          onCreated={({ gl, scene }) => {
            setIsAvatarReady(true);
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <AvatarScene
            selectedGender={selectedGender}
            customization={customization}
          />
        </Canvas>

        {/* Status Badge */}
        <Box
          position="absolute"
          top="90px"
          right="20px"
          bg="rgba(0,0,0,0.7)"
          backdropFilter="blur(10px)"
          px={3}
          py={2}
          borderRadius="full"
          fontSize="xs"
          fontWeight="bold"
          color={isAvatarReady ? "green.400" : "yellow.400"}
        >
          {isAvatarReady ? "✨ Ready" : "⏳ Loading..."}
        </Box>

        {/* Items on Avatar Badge */}
        {itemsOnAvatar > 0 && (
          <Box
            position="absolute"
            top="130px"
            right="20px"
            bg="rgba(72, 187, 120, 0.9)"
            backdropFilter="blur(10px)"
            px={3}
            py={2}
            borderRadius="full"
            fontSize="xs"
            fontWeight="bold"
            color="white"
          >
            {itemsOnAvatar} item{itemsOnAvatar > 1 ? "s" : ""} on avatar
          </Box>
        )}

        {/* Action Buttons */}
        <HStack
          position="absolute"
          bottom="20px"
          left="50%"
          transform="translateX(-50%)"
          spacing={2}
          zIndex={100}
          bg="rgba(0, 0, 0, 0.8)"
          backdropFilter="blur(10px)"
          p={2}
          borderRadius="full"
          boxShadow="xl"
        >
          <Button
            leftIcon={<FaExchangeAlt />}
            colorScheme="blackAlpha"
            bg="rgba(255, 255, 255, 0.1)"
            color="white"
            size="md"
            borderRadius="full"
            onClick={() => {
              console.log("🔓 Opening slide bar");
              setIsProductPanelOpen(true);
            }}
            _hover={{ bg: "rgba(255, 255, 255, 0.2)" }}
            fontWeight="bold"
            px={5}
            fontSize="xs"
          >
            CHANGE OUTFIT
          </Button>
          <Button
            leftIcon={<FaPalette />}
            colorScheme="blackAlpha"
            bg="rgba(255, 255, 255, 0.1)"
            color="white"
            size="md"
            borderRadius="full"
            onClick={onCustomizeOpen}
            _hover={{ bg: "rgba(255, 255, 255, 0.2)" }}
            fontWeight="bold"
            px={5}
            fontSize="xs"
          >
            CUSTOMIZE AVATAR
          </Button>
          <Button
            leftIcon={<FaShoppingCart />}
            colorScheme="blue"
            variant="solid"
            size="md"
            borderRadius="full"
            onClick={handleAddAllToCart}
            isDisabled={itemsOnAvatar === 0}
            _hover={{ bg: "blue.600" }}
            fontWeight="bold"
            px={5}
            fontSize="xs"
          >
            ADD TO CART
          </Button>
        </HStack>
      </Box>

      {/* Customize Avatar Drawer - KEEPING YOUR ORIGINAL */}
      <Drawer
        isOpen={isCustomizeOpen}
        placement="right"
        onClose={onCustomizeClose}
        size="md"
      >
        <DrawerOverlay backdropFilter="blur(4px)" />
        <DrawerContent bg="gray.900" color="white">
          <DrawerCloseButton size="lg" />
          <DrawerHeader borderBottomWidth="1px" borderColor="gray.700" pb={4}>
            <VStack align="start" spacing={2}>
              <HStack spacing={2}>
                <FaPalette size={24} color="#48BB78" />
                <Text fontSize="2xl" fontWeight="bold">
                  Customize Avatar
                </Text>
              </HStack>
              <Text fontSize="sm" fontWeight="normal" color="gray.400">
                Personalize your virtual try-on experience
              </Text>
            </VStack>
          </DrawerHeader>

          <DrawerBody pt={6}>
            <VStack spacing={6} align="stretch">
              {/* Gender Selection */}
              <Box>
                <Text fontWeight="bold" mb={3} fontSize="lg" color="green.400">
                  Avatar Gender
                </Text>
                <Stack direction="column" spacing={3}>
                  <Button
                    size="lg"
                    variant={selectedGender === "male" ? "solid" : "outline"}
                    colorScheme="blue"
                    onClick={() => handleGenderChange("male")}
                    justifyContent="flex-start"
                    leftIcon={<FaMale size={20} />}
                    h="60px"
                  >
                    <VStack align="start" spacing={0}>
                      <Text fontSize="md" fontWeight="bold">
                        Male Avatar
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        Default male model
                      </Text>
                    </VStack>
                  </Button>
                  <Button
                    size="lg"
                    variant={selectedGender === "female" ? "solid" : "outline"}
                    colorScheme="pink"
                    onClick={() => handleGenderChange("female")}
                    justifyContent="flex-start"
                    leftIcon={<FaFemale size={20} />}
                    h="60px"
                  >
                    <VStack align="start" spacing={0}>
                      <Text fontSize="md" fontWeight="bold">
                        Female Avatar
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        Default female model
                      </Text>
                    </VStack>
                  </Button>
                </Stack>
              </Box>

              <Divider borderColor="gray.700" />

              {/* Skin Tone */}
              <Box>
                <Text fontWeight="bold" mb={3} fontSize="md" color="green.400">
                  Skin Tone
                </Text>
                <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                  {[
                    { color: "#ffdbac", name: "Light" },
                    { color: "#f1c27d", name: "Fair" },
                    { color: "#e0ac69", name: "Medium" },
                    { color: "#c68642", name: "Olive" },
                    { color: "#8d5524", name: "Brown" },
                    { color: "#4a2511", name: "Dark" },
                  ].map(({ color, name }) => (
                    <VStack
                      key={color}
                      spacing={1}
                      cursor="pointer"
                      onClick={() => updateCustomization("skinTone", color)}
                    >
                      <Box
                        w="70px"
                        h="70px"
                        bg={color}
                        borderRadius="lg"
                        border={
                          customization.skinTone === color
                            ? "4px solid"
                            : "2px solid"
                        }
                        borderColor={
                          customization.skinTone === color
                            ? "green.400"
                            : "gray.600"
                        }
                        transition="all 0.2s"
                        boxShadow={
                          customization.skinTone === color ? "lg" : "none"
                        }
                        _hover={{
                          transform: "scale(1.05)",
                          borderColor: "green.300",
                        }}
                      />
                      <Text fontSize="xs" color="gray.400">
                        {name}
                      </Text>
                    </VStack>
                  ))}
                </Grid>
              </Box>

              <Divider borderColor="gray.700" />

              {/* Hair Color */}
              <Box>
                <Text fontWeight="bold" mb={3} fontSize="md" color="green.400">
                  Hair Color
                </Text>
                <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                  {[
                    { color: "#000000", name: "Black" },
                    { color: "#2c1810", name: "Dark Brown" },
                    { color: "#6b4423", name: "Brown" },
                    { color: "#a0522d", name: "Auburn" },
                    { color: "#daa520", name: "Blonde" },
                    { color: "#d3d3d3", name: "Gray" },
                  ].map(({ color, name }) => (
                    <VStack
                      key={color}
                      spacing={1}
                      cursor="pointer"
                      onClick={() => updateCustomization("hairColor", color)}
                    >
                      <Box
                        w="70px"
                        h="70px"
                        bg={color}
                        borderRadius="lg"
                        border={
                          customization.hairColor === color
                            ? "4px solid"
                            : "2px solid"
                        }
                        borderColor={
                          customization.hairColor === color
                            ? "green.400"
                            : "gray.600"
                        }
                        transition="all 0.2s"
                        boxShadow={
                          customization.hairColor === color ? "lg" : "none"
                        }
                        _hover={{
                          transform: "scale(1.05)",
                          borderColor: "green.300",
                        }}
                      />
                      <Text fontSize="xs" color="gray.400">
                        {name}
                      </Text>
                    </VStack>
                  ))}
                </Grid>
              </Box>

              <Divider borderColor="gray.700" />

              {/* Shirt Color */}
              <Box>
                <Text fontWeight="bold" mb={3} fontSize="md" color="green.400">
                  Shirt Color
                </Text>
                <Grid templateColumns="repeat(4, 1fr)" gap={3}>
                  {["#4a90e2", "#1abc9c", "#e74c3c", "#f1c40f"].map((color) => (
                    <Box
                      key={color}
                      w="60px"
                      h="60px"
                      bg={color}
                      borderRadius="lg"
                      border={
                        customization.shirtColor === color
                          ? "4px solid"
                          : "2px solid"
                      }
                      borderColor={
                        customization.shirtColor === color
                          ? "green.400"
                          : "gray.600"
                      }
                      cursor="pointer"
                      onClick={() => updateCustomization("shirtColor", color)}
                      transition="all 0.2s"
                      boxShadow={
                        customization.shirtColor === color ? "lg" : "none"
                      }
                      _hover={{
                        transform: "scale(1.05)",
                        borderColor: "green.300",
                      }}
                    />
                  ))}
                </Grid>
              </Box>

              <Divider borderColor="gray.700" />

              {/* Pants Color */}
              <Box>
                <Text fontWeight="bold" mb={3} fontSize="md" color="green.400">
                  Pants Color
                </Text>
                <Grid templateColumns="repeat(4, 1fr)" gap={3}>
                  {["#2c3e50", "#7f8c8d", "#8e44ad", "#d35400"].map((color) => (
                    <Box
                      key={color}
                      w="60px"
                      h="60px"
                      bg={color}
                      borderRadius="lg"
                      border={
                        customization.pantsColor === color
                          ? "4px solid"
                          : "2px solid"
                      }
                      borderColor={
                        customization.pantsColor === color
                          ? "green.400"
                          : "gray.600"
                      }
                      cursor="pointer"
                      onClick={() => updateCustomization("pantsColor", color)}
                      transition="all 0.2s"
                      boxShadow={
                        customization.pantsColor === color ? "lg" : "none"
                      }
                      _hover={{
                        transform: "scale(1.05)",
                        borderColor: "green.300",
                      }}
                    />
                  ))}
                </Grid>
              </Box>

              <Divider borderColor="gray.700" />

              {/* Action Buttons */}
              <VStack spacing={3}>
                <Button
                  colorScheme="green"
                  size="lg"
                  w="full"
                  onClick={() => {
                    toast({
                      title: "✅ Customization saved!",
                      description: "Your avatar preferences have been saved",
                      status: "success",
                      duration: 3000,
                      position: "top",
                    });
                    onCustomizeClose();
                  }}
                  leftIcon={<FaCheck />}
                >
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  colorScheme="whiteAlpha"
                  size="md"
                  w="full"
                  onClick={() => {
                    setCustomization({
                      skinTone: "#ffdbac",
                      hairColor: "#2c1810",
                      shirtColor: "#4a90e2",
                      pantsColor: "#2c3e50",
                    });
                    toast({
                      title: "Reset to defaults",
                      status: "info",
                      duration: 2000,
                    });
                  }}
                >
                  Reset to Defaults
                </Button>
              </VStack>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* CRITICAL: Wishlist Slide-Up Panel - STAYS OPEN */}
      <Slide direction="bottom" in={isProductPanelOpen} style={{ zIndex: 60 }}>
        <Box
          bg="#1c1c1c"
          borderTopRadius="24px"
          boxShadow="0 -4px 30px rgba(0, 0, 0, 0.9)"
          h={`${productPanelHeight}px`}
          position="relative"
        >
          <Flex
            justify="space-between"
            align="center"
            px={4}
            py={3}
            borderBottom="1px solid"
            borderColor="gray.800"
          >
            <HStack spacing={2}>
              <FaHeart color="#FF4444" size={18} />
              <Text fontWeight="bold" fontSize="lg" color="white">
                My Wishlist
              </Text>
              <Badge colorScheme="pink" fontSize="10px">
                {filteredProducts.length} items
              </Badge>
            </HStack>

            {/* CRITICAL: ONLY this button closes the slide bar */}
            <IconButton
              aria-label="Close panel"
              icon={<FaTimes />}
              size="sm"
              variant="ghost"
              colorScheme="whiteAlpha"
              onClick={() => {
                console.log("🔒 Closing slide bar");
                setIsProductPanelOpen(false);
              }}
              borderRadius="full"
            />
          </Flex>

          <HStack
            spacing={2}
            px={4}
            py={2}
            overflowX="auto"
            borderBottom="1px solid"
            borderColor="gray.800"
            css={{ "&::-webkit-scrollbar": { height: "4px" } }}
          >
            {categories.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={activeCategory === cat.id ? "solid" : "ghost"}
                colorScheme={activeCategory === cat.id ? "pink" : "whiteAlpha"}
                onClick={() => setActiveCategory(cat.id)}
                borderRadius="full"
                fontSize="11px"
                px={3}
                minW="fit-content"
                _hover={{
                  bg: activeCategory === cat.id ? "pink.500" : "whiteAlpha.200",
                }}
              >
                <Text mr={1}>{cat.icon}</Text>
                {cat.label}
              </Button>
            ))}
          </HStack>

          <Box
            h={`calc(${productPanelHeight}px - 150px)`}
            overflowY="auto"
            overflowX="hidden"
            px={4}
            py={3}
            css={{
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": {
                background: "#4A5568",
                borderRadius: "24px",
              },
            }}
          >
            {loading ? (
              <Flex justify="center" align="center" h="100%">
                <VStack spacing={3}>
                  <Spinner size="xl" color="pink.400" thickness="4px" />
                  <Text color="gray.400" fontSize="sm">
                    Loading wishlist...
                  </Text>
                </VStack>
              </Flex>
            ) : filteredProducts.length > 0 ? (
              <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                {filteredProducts.map((product) => (
                  <ProductItem
                    key={product.id}
                    product={product}
                    isSelected={selectedItemId === product.id}
                    onSelect={() => handleClothingSelect(product)}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </Grid>
            ) : (
              <VStack spacing={3} py={10}>
                <Text fontSize="4xl">❤️</Text>
                <Text color="gray.400" fontSize="sm" textAlign="center">
                  {products.length === 0
                    ? "Your wishlist is empty! Visit Collections to add items."
                    : "No items in this category"}
                </Text>
                <Button
                  size="sm"
                  colorScheme="pink"
                  variant="solid"
                  leftIcon={<FaShoppingBag />}
                  onClick={() => navigate("/collections")}
                >
                  Browse Collections
                </Button>
              </VStack>
            )}
          </Box>
        </Box>
      </Slide>

      {/* Bottom Panel - KEEPING YOUR ORIGINAL */}
      <Box
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        h={`${panelHeight}px`}
        bg="#1c1c1c"
        borderTopRadius="24px"
        boxShadow="0 -4px 30px rgba(0, 0, 0, 0.9)"
        zIndex={50}
        transition={isDragging ? "none" : "height 0.3s ease"}
      >
        <Flex
          justify="center"
          align="center"
          py={2}
          cursor="ns-resize"
          _active={{ cursor: "grabbing" }}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          userSelect="none"
        >
          <VStack spacing={0.5}>
            <Box w="50px" h="5px" bg="gray.600" borderRadius="full" />
            <IconButton
              icon={isMinimized ? <FaChevronUp /> : <FaChevronDown />}
              size="xs"
              variant="ghost"
              colorScheme="whiteAlpha"
              onClick={toggleMinimize}
              aria-label="Toggle panel"
              mt={1}
            />
          </VStack>
        </Flex>

        <HStack
          spacing={0}
          mb={1}
          px={4}
          borderBottomWidth="1px"
          borderColor="gray.800"
        >
          <Button
            flex={1}
            variant="ghost"
            onClick={() => setActiveTab("fashion")}
            borderBottom={activeTab === "fashion" ? "3px solid" : "none"}
            borderColor="green.400"
            borderRadius={0}
            color={activeTab === "fashion" ? "white" : "gray.500"}
            fontWeight="bold"
            py={2}
            _hover={{ bg: "transparent", color: "white" }}
            fontSize="sm"
          >
            <FaTshirt style={{ marginRight: "6px" }} />
            Fashion
          </Button>
          <Button
            flex={1}
            variant="ghost"
            onClick={() => setActiveTab("closet")}
            borderBottom={activeTab === "closet" ? "3px solid" : "none"}
            borderColor="green.400"
            borderRadius={0}
            color={activeTab === "closet" ? "white" : "gray.500"}
            fontWeight="bold"
            py={2}
            _hover={{ bg: "transparent", color: "white" }}
            fontSize="sm"
          >
            <FaHeart style={{ marginRight: "6px" }} />
            Closet
          </Button>
          <Button
            flex={1}
            variant="ghost"
            onClick={() => setActiveTab("avatar")}
            borderBottom={activeTab === "avatar" ? "3px solid" : "none"}
            borderColor="green.400"
            borderRadius={0}
            color={activeTab === "avatar" ? "white" : "gray.500"}
            fontWeight="bold"
            py={2}
            _hover={{ bg: "transparent", color: "white" }}
            fontSize="sm"
          >
            <FaUser style={{ marginRight: "6px" }} />
            Avatar
          </Button>
        </HStack>

        <Box
          h={`calc(${panelHeight}px - 90px)`}
          overflowY="auto"
          overflowX="hidden"
          px={4}
          css={{
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              background: "#4A5568",
              borderRadius: "24px",
            },
          }}
        >
          {activeTab === "fashion" && (
            <VStack spacing={4} align="stretch" py={6}>
              <Text fontSize="md" fontWeight="bold" color="white">
                Style Tips ✨
              </Text>
              <Box textAlign="center" py={8} bg="gray.800" borderRadius="xl">
                <Text fontSize="4xl" mb={2}>
                  ❤️
                </Text>
                <Text color="gray.400" fontSize="sm" mb={3}>
                  Click "My Wishlist" to try on your favorite items
                </Text>
                <Button
                  colorScheme="pink"
                  size="md"
                  borderRadius="full"
                  leftIcon={<FaHeart />}
                  onClick={() => setIsProductPanelOpen(true)}
                >
                  Open Wishlist
                </Button>
              </Box>
            </VStack>
          )}

          {activeTab === "closet" && (
            <VStack spacing={4} align="stretch" py={6}>
              <Text fontSize="md" fontWeight="bold" color="white">
                My Saved Outfits ❤️
              </Text>
              <Box textAlign="center" py={8} bg="gray.800" borderRadius="xl">
                <Text fontSize="4xl" mb={2}>
                  ❤️
                </Text>
                <Text color="gray.400" fontSize="sm" mb={3}>
                  Saved outfits coming soon. For now, use Save Outfit to
                  remember your looks.
                </Text>
              </Box>
            </VStack>
          )}

          {activeTab === "avatar" && (
            <VStack spacing={4} align="stretch" py={6}>
              <Text fontSize="md" fontWeight="bold" color="white">
                Avatar Settings 👤
              </Text>
              <Box textAlign="center" py={8} bg="gray.800" borderRadius="xl">
                <Text color="gray.400" fontSize="sm" mb={3}>
                  Use the Customize Avatar button above to change skin tone,
                  hair, and clothing colors.
                </Text>
                <Button
                  colorScheme="green"
                  size="md"
                  borderRadius="full"
                  leftIcon={<FaPalette />}
                  onClick={onCustomizeOpen}
                >
                  Customize Avatar
                </Button>
              </Box>
            </VStack>
          )}
        </Box>

        {/* Slide footer: persistent Add to Cart for selected item + Done button */}
        <Flex
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          px={4}
          py={3}
          borderTop="1px solid"
          borderColor="gray.800"
          align="center"
          bg="#111"
          justify="space-between"
        >
          <Box>
            {selectedItemId ? (
              (() => {
                const sel = filteredProducts.find(
                  (p) => p.id === selectedItemId,
                );
                if (!sel)
                  return <Text color="gray.400">Selected item not found</Text>;
                return (
                  <HStack spacing={3}>
                    <Image
                      src={sel.image}
                      boxSize="48px"
                      objectFit="cover"
                      borderRadius="md"
                    />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="bold">
                        {sel.name}
                      </Text>
                      {sel.price && (
                        <Text fontSize="xs" color="gray.400">
                          {typeof sel.price === "number"
                            ? `$${sel.price}`
                            : sel.price}
                        </Text>
                      )}
                    </VStack>
                  </HStack>
                );
              })()
            ) : (
              <Text color="gray.400" fontSize="sm">
                Select an item to enable Add to Cart
              </Text>
            )}
          </Box>

          <HStack spacing={2}>
            <Button
              size="sm"
              variant="ghost"
              colorScheme="whiteAlpha"
              onClick={() => {
                setSelectedItemId(null);
                setForceUpdate((p) => p + 1);
              }}
            >
              Deselect
            </Button>

            <Button
              size="sm"
              colorScheme="blue"
              onClick={() => {
                const sel = filteredProducts.find(
                  (p) => p.id === selectedItemId,
                );
                if (sel) handleAddToCart(sel);
              }}
              isDisabled={!selectedItemId}
              leftIcon={<FaShoppingCart />}
            >
              Add to Cart
            </Button>

            <Button
              size="sm"
              colorScheme="gray"
              variant="outline"
              onClick={() => {
                setIsProductPanelOpen(false);
                setSelectedItemId(null);
              }}
            >
              Done
            </Button>
          </HStack>
        </Flex>
      </Box>
    </Box>
  );
};

export default VirtualTryOnApp;


