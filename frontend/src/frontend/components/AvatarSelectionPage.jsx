import React, { useState, Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  PerspectiveCamera,
} from "@react-three/drei";
import { useNavigate, Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheck,
  FaMale,
  FaFemale,
  FaRedo,
  FaPalette,
  FaUserCircle,
  FaCut,
  FaEye,
  FaTimes,
  FaSmile,
  FaHeart,
  FaStar,
} from "react-icons/fa";
import { GiLips, GiEyelashes } from "react-icons/gi";
import RealisticAvatar from "./RealisticAvatar";
import useAvatarStore from "../../store/avatarStore";
//  Only these customization categories are FREE
const FREE_CATEGORIES = ["skin", "eyes"];
const MALE_CUSTOMIZATION_OPTIONS = {
  body: {
    name: "Body",
    icon: FaUserCircle,
    options: [
      { id: "slim", name: "Slim", description: "Lean build", emoji: "🏃" },
      { id: "average", name: "Average", description: "Standard", emoji: "🧍" },
      {
        id: "athletic",
        name: "Athletic",
        description: "Fit & toned",
        emoji: "💪",
      },
      {
        id: "broad",
        name: "Broad",
        description: "Wide shoulders",
        emoji: "🦾",
      },
      {
        id: "muscular",
        name: "Muscular",
        description: "Very built",
        emoji: "🏋️",
      },
    ],
  },
  skin: {
    name: "Skin Tone",
    icon: FaPalette,
    options: [
      { id: "porcelain", name: "Porcelain", color: "#FFF5F0" },
      { id: "fair", name: "Fair", color: "#FFE4C4" },
      { id: "light", name: "Light", color: "#F5CBA7" },
      { id: "medium", name: "Medium", color: "#D4A574" },
      { id: "tan", name: "Tan", color: "#C68642" },
      { id: "olive", name: "Olive", color: "#B08958" },
      { id: "brown", name: "Brown", color: "#8D5524" },
      { id: "dark", name: "Dark", color: "#5C4033" },
      { id: "deep", name: "Deep", color: "#3D2817" },
      { id: "ebony", name: "Ebony", color: "#2C1810" },
    ],
  },
  hair: {
    name: "Hairstyle",
    icon: FaCut,
    options: [
      { id: "bald", name: "Bald", emoji: "🥚", description: "No hair" },
      { id: "buzz", name: "Buzz Cut", emoji: "⚡", description: "Very short" },
      { id: "short", name: "Short", emoji: "✂️", description: "Classic" },
      { id: "crew", name: "Crew Cut", emoji: "🪖", description: "Military" },
      { id: "fade", name: "Fade", emoji: "💈", description: "Tapered" },
      {
        id: "pompadour",
        name: "Pompadour",
        emoji: "🎩",
        description: "Classic style",
      },
      {
        id: "side-part",
        name: "Side Part",
        emoji: "🧑‍💼",
        description: "Professional",
      },
      { id: "quiff", name: "Quiff", emoji: "🎸", description: "Modern" },
      {
        id: "slicked-back",
        name: "Slicked Back",
        emoji: "🕴️",
        description: "Formal",
      },
      { id: "medium", name: "Medium", emoji: "💇", description: "Medium" },
      { id: "long", name: "Long", emoji: "🤘", description: "Rock style" },
      { id: "curly", name: "Curly", emoji: "🌀", description: "Natural curls" },
      { id: "wavy", name: "Wavy", emoji: "〰️", description: "Soft waves" },
      { id: "man-bun", name: "Man Bun", emoji: "🥐", description: "Tied up" },
      {
        id: "dreadlocks",
        name: "Dreadlocks",
        emoji: "🧵",
        description: "Locked",
      },
    ],
  },
  hairColor: {
    name: "Hair Color",
    icon: FaPalette,
    options: [
      { id: "jet-black", name: "Jet Black", color: "#0C0C0C" },
      { id: "black", name: "Black", color: "#1C1C1C" },
      { id: "dark-brown", name: "Dark Brown", color: "#3D2817" },
      { id: "brown", name: "Brown", color: "#654321" },
      { id: "light-brown", name: "Light Brown", color: "#8B6914" },
      { id: "chestnut", name: "Chestnut", color: "#954535" },
      { id: "auburn", name: "Auburn", color: "#A52A2A" },
      { id: "ginger", name: "Ginger", color: "#D2691E" },
      { id: "blonde", name: "Blonde", color: "#E6C28C" },
      { id: "dirty-blonde", name: "Dirty Blonde", color: "#C9A573" },
      { id: "platinum", name: "Platinum", color: "#E5E4E2" },
      { id: "gray", name: "Gray", color: "#808080" },
      { id: "silver", name: "Silver", color: "#C0C0C0" },
      { id: "white", name: "White", color: "#F5F5F5" },
    ],
  },
  eyes: {
    name: "Eye Color",
    icon: FaEye,
    options: [
      { id: "black", name: "Black", color: "#1C1C1C" },
      { id: "dark-brown", name: "Dark Brown", color: "#3D2817" },
      { id: "brown", name: "Brown", color: "#654321" },
      { id: "light-brown", name: "Light Brown", color: "#8B6914" },
      { id: "hazel", name: "Hazel", color: "#8E7618" },
      { id: "amber", name: "Amber", color: "#FFBF00" },
      { id: "green", name: "Green", color: "#5FA777" },
      { id: "blue", name: "Blue", color: "#4A90E2" },
      { id: "light-blue", name: "Light Blue", color: "#87CEEB" },
      { id: "gray", name: "Gray", color: "#708090" },
      { id: "violet", name: "Violet", color: "#8B00FF" },
    ],
  },
  eyebrows: {
    name: "Eyebrows",
    icon: GiEyelashes,
    options: [
      { id: "thin", name: "Thin", emoji: "─", description: "Light" },
      { id: "natural", name: "Natural", emoji: "━", description: "Natural" },
      { id: "thick", name: "Thick", emoji: "═", description: "Bold" },
      { id: "arched", name: "Arched", emoji: "⌒", description: "High arch" },
      { id: "straight", name: "Straight", emoji: "▬", description: "Straight" },
      { id: "bushy", name: "Bushy", emoji: "▓", description: "Very thick" },
    ],
  },
  facialHair: {
    name: "Facial Hair",
    icon: FaSmile,
    options: [
      { id: "none", name: "None", emoji: "😊", description: "Clean shaven" },
      { id: "stubble", name: "Stubble", emoji: "🪒", description: "Light" },
      {
        id: "light-beard",
        name: "Light Beard",
        emoji: "🧔",
        description: "Short beard",
      },
      {
        id: "medium-beard",
        name: "Medium Beard",
        emoji: "🧔‍♂️",
        description: "Medium",
      },
      {
        id: "full-beard",
        name: "Full Beard",
        emoji: "🧔‍♂️",
        description: "Full",
      },
      { id: "goatee", name: "Goatee", emoji: "🎭", description: "Chin only" },
      {
        id: "mustache",
        name: "Mustache",
        emoji: "👨",
        description: "Upper lip",
      },
      {
        id: "soul-patch",
        name: "Soul Patch",
        emoji: "🎵",
        description: "Small patch",
      },
      {
        id: "van-dyke",
        name: "Van Dyke",
        emoji: "🎩",
        description: "Goatee + stache",
      },
      {
        id: "circle-beard",
        name: "Circle Beard",
        emoji: "⭕",
        description: "Around mouth",
      },
    ],
  },
};

const FEMALE_CUSTOMIZATION_OPTIONS = {
  body: {
    name: "Body",
    icon: FaUserCircle,
    options: [
      { id: "petite", name: "Petite", description: "Small frame", emoji: "🧚" },
      { id: "slim", name: "Slim", description: "Lean build", emoji: "🏃‍♀️" },
      { id: "average", name: "Average", description: "Standard", emoji: "🧍‍♀️" },
      {
        id: "athletic",
        name: "Athletic",
        description: "Fit & toned",
        emoji: "💪",
      },
      { id: "curvy", name: "Curvy", description: "Curves", emoji: "👗" },
      {
        id: "plus",
        name: "Plus Size",
        description: "Fuller figure",
        emoji: "👸",
      },
    ],
  },
  skin: {
    name: "Skin Tone",
    icon: FaPalette,
    options: [
      { id: "porcelain", name: "Porcelain", color: "#FFF5F0" },
      { id: "fair", name: "Fair", color: "#FFE4C4" },
      { id: "light", name: "Light", color: "#F5CBA7" },
      { id: "medium", name: "Medium", color: "#D4A574" },
      { id: "tan", name: "Tan", color: "#C68642" },
      { id: "olive", name: "Olive", color: "#B08958" },
      { id: "brown", name: "Brown", color: "#8D5524" },
      { id: "dark", name: "Dark", color: "#5C4033" },
      { id: "deep", name: "Deep", color: "#3D2817" },
      { id: "ebony", name: "Ebony", color: "#2C1810" },
    ],
  },
  hair: {
    name: "Hairstyle",
    icon: FaCut,
    options: [
      {
        id: "pixie",
        name: "Pixie Cut",
        emoji: "✂️",
        description: "Very short",
      },
      { id: "bob", name: "Bob", emoji: "💇‍♀️", description: "Classic bob" },
      {
        id: "lob",
        name: "Long Bob",
        emoji: "💁‍♀️",
        description: "Shoulder length",
      },
      {
        id: "shoulder",
        name: "Shoulder Length",
        emoji: "👩",
        description: "Medium",
      },
      { id: "long", name: "Long", emoji: "💆‍♀️", description: "Long hair" },
      {
        id: "very-long",
        name: "Very Long",
        emoji: "👰",
        description: "Extra long",
      },
      { id: "wavy", name: "Wavy", emoji: "〰️", description: "Soft waves" },
      { id: "curly", name: "Curly", emoji: "🌀", description: "Natural curls" },
      {
        id: "tight-curls",
        name: "Tight Curls",
        emoji: "🌪️",
        description: "Tight curls",
      },
      {
        id: "straight",
        name: "Straight",
        emoji: "━",
        description: "Sleek straight",
      },
      {
        id: "ponytail",
        name: "Ponytail",
        emoji: "🎀",
        description: "Tied back",
      },
      {
        id: "high-ponytail",
        name: "High Ponytail",
        emoji: "🎈",
        description: "High up",
      },
      { id: "bun", name: "Bun", emoji: "🥐", description: "Top knot" },
      {
        id: "messy-bun",
        name: "Messy Bun",
        emoji: "🌸",
        description: "Casual bun",
      },
      { id: "braids", name: "Braids", emoji: "🪢", description: "Braided" },
      {
        id: "french-braid",
        name: "French Braid",
        emoji: "🥖",
        description: "French style",
      },
      {
        id: "pigtails",
        name: "Pigtails",
        emoji: "🎪",
        description: "Two sides",
      },
      { id: "half-up", name: "Half Up", emoji: "👑", description: "Half tied" },
    ],
  },
  hairColor: {
    name: "Hair Color",
    icon: FaPalette,
    options: [
      { id: "jet-black", name: "Jet Black", color: "#0C0C0C" },
      { id: "black", name: "Black", color: "#1C1C1C" },
      { id: "dark-brown", name: "Dark Brown", color: "#3D2817" },
      { id: "brown", name: "Brown", color: "#654321" },
      { id: "chocolate", name: "Chocolate", color: "#4A2C2A" },
      { id: "caramel", name: "Caramel", color: "#AF6E4D" },
      { id: "light-brown", name: "Light Brown", color: "#8B6914" },
      { id: "auburn", name: "Auburn", color: "#A52A2A" },
      { id: "red", name: "Red", color: "#B22222" },
      { id: "copper", name: "Copper", color: "#D2691E" },
      { id: "strawberry", name: "Strawberry", color: "#E67451" },
      { id: "blonde", name: "Blonde", color: "#E6C28C" },
      { id: "honey", name: "Honey Blonde", color: "#D4A76A" },
      { id: "platinum", name: "Platinum", color: "#E5E4E2" },
      { id: "ash-blonde", name: "Ash Blonde", color: "#B2A388" },
      { id: "gray", name: "Gray", color: "#808080" },
      { id: "silver", name: "Silver", color: "#C0C0C0" },
      { id: "white", name: "White", color: "#F5F5F5" },
      { id: "pink", name: "Pink", color: "#FF69B4" },
      { id: "purple", name: "Purple", color: "#9370DB" },
      { id: "blue", name: "Blue", color: "#4169E1" },
    ],
  },
  eyes: {
    name: "Eye Color",
    icon: FaEye,
    options: [
      { id: "black", name: "Black", color: "#1C1C1C" },
      { id: "dark-brown", name: "Dark Brown", color: "#3D2817" },
      { id: "brown", name: "Brown", color: "#654321" },
      { id: "light-brown", name: "Light Brown", color: "#8B6914" },
      { id: "hazel", name: "Hazel", color: "#8E7618" },
      { id: "amber", name: "Amber", color: "#FFBF00" },
      { id: "green", name: "Green", color: "#5FA777" },
      { id: "blue", name: "Blue", color: "#4A90E2" },
      { id: "light-blue", name: "Light Blue", color: "#87CEEB" },
      { id: "gray", name: "Gray", color: "#708090" },
      { id: "violet", name: "Violet", color: "#8B00FF" },
    ],
  },
  eyebrows: {
    name: "Eyebrows",
    icon: GiEyelashes,
    options: [
      { id: "thin", name: "Thin", emoji: "─", description: "Pencil thin" },
      { id: "natural", name: "Natural", emoji: "━", description: "Natural" },
      { id: "thick", name: "Thick", emoji: "═", description: "Bold brows" },
      { id: "arched", name: "Arched", emoji: "⌒", description: "High arch" },
      { id: "straight", name: "Straight", emoji: "▬", description: "Straight" },
      { id: "rounded", name: "Rounded", emoji: "◡", description: "Soft curve" },
      { id: "s-shaped", name: "S-Shaped", emoji: "∽", description: "Curved" },
    ],
  },
  eyelashes: {
    name: "Eyelashes",
    icon: GiEyelashes,
    options: [
      { id: "natural", name: "Natural", emoji: "👁️", description: "Natural" },
      {
        id: "light-mascara",
        name: "Light Mascara",
        emoji: "✨",
        description: "Subtle",
      },
      { id: "mascara", name: "Mascara", emoji: "💫", description: "Defined" },
      { id: "dramatic", name: "Dramatic", emoji: "🌟", description: "Bold" },
      {
        id: "false-lashes",
        name: "False Lashes",
        emoji: "⭐",
        description: "Full glam",
      },
    ],
  },
  lips: {
    name: "Lips",
    icon: GiLips,
    options: [
      { id: "thin", name: "Thin", emoji: "━", description: "Thin lips" },
      { id: "medium", name: "Medium", emoji: "═", description: "Average" },
      { id: "full", name: "Full", emoji: "▓", description: "Full lips" },
      { id: "plump", name: "Plump", emoji: "💋", description: "Very full" },
    ],
  },
  makeup: {
    name: "Makeup",
    icon: FaStar,
    options: [
      { id: "none", name: "None", emoji: "🌿", description: "Natural" },
      { id: "natural", name: "Natural", emoji: "☀️", description: "Light" },
      { id: "everyday", name: "Everyday", emoji: "💄", description: "Casual" },
      { id: "evening", name: "Evening", emoji: "✨", description: "Elegant" },
      { id: "glam", name: "Glam", emoji: "💃", description: "Full glam" },
    ],
  },
  accessories: {
    name: "Accessories",
    icon: FaHeart,
    options: [
      { id: "none", name: "None", emoji: "➖", description: "No accessories" },
      {
        id: "earrings-small",
        name: "Small Earrings",
        emoji: "💍",
        description: "Studs",
      },
      {
        id: "earrings-hoop",
        name: "Hoop Earrings",
        emoji: "⭕",
        description: "Hoops",
      },
      {
        id: "earrings-dangle",
        name: "Dangle Earrings",
        emoji: "💎",
        description: "Long style",
      },
      {
        id: "headband",
        name: "Headband",
        emoji: "👑",
        description: "Head accessory",
      },
      { id: "bow", name: "Bow", emoji: "🎀", description: "Hair bow" },
      {
        id: "flowers",
        name: "Flowers",
        emoji: "🌸",
        description: "Floral accent",
      },
    ],
  },
};

import "../styles/avatarselection.css";

const AvatarSelectionPage = () => {
  const navigate = useNavigate();

  const [selectedAvatar, setSelectedAvatar] = useState(
    localStorage.getItem("trymi_selected_avatar") || "male",
  );
  const [customizingAvatar, setCustomizingAvatar] = useState(null);
  const [activeCategory, setActiveCategory] = useState("skin");
  const [hoveredCard, setHoveredCard] = useState(null);
  const [notification, setNotification] = useState(null);
  const [rerenderKey, setRerenderKey] = useState(0);

  // Zustand Store
  const {
    customization: storeCustomization,
    setGender,
    updateCustomization,
    syncWithLocalStorage
  } = useAvatarStore();

  // Sync with store on mount
  useEffect(() => {
    syncWithLocalStorage();
    const saved = localStorage.getItem("trymi_selected_avatar");
    if (saved) setSelectedAvatar(saved);
  }, []);

  const avatars = [
    {
      id: "male",
      name: "Standard Male",
      icon: FaMale,
      description: "Balanced athletic build, ideal for streetwear and tailoring.",
      cameraPosition: [0, 1.5, 3.5],
      targetPosition: [0, 1, 0],
    },
    {
      id: "female",
      name: "Standard Female",
      icon: FaFemale,
      description: "Classic feminine silhouette, perfect for dresses and casual wear.",
      cameraPosition: [0, 1.4, 3.2],
      targetPosition: [0, 0.9, 0],
    },
  ];

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSelectAvatar = (id) => {
    setSelectedAvatar(id);
    setGender(id);
    showNotification(`✨ ${id === "male" ? "Male" : "Female"} avatar selected!`);
  };
  const openCustomization = (id) => {
    setCustomizingAvatar(id);
    setGender(id);
    setSelectedAvatar(id);
    setActiveCategory("skin");
    setTimeout(() => {
      const panel = document.querySelector(".customization-panel");
      if (panel) {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const closeCustomization = () => {
    setCustomizingAvatar(null);
  };

  const handleCustomizationSelect = (category, optionId) => {
    if (!FREE_CATEGORIES.includes(category)) {
      showNotification("🔒 This feature is premium only");
      return;
    }
    updateCustomization(category, optionId);
    setRerenderKey(prev => prev + 1);
  };

  const handleConfirmSelection = () => {
    setGender(selectedAvatar);
    localStorage.setItem("trymi_selected_avatar", selectedAvatar);
    showNotification("✅ Avatar saved successfully!");
    setTimeout(() => navigate("/virtual-try-on"), 1500);
  };

  const getCustomizationOptions = () => {
    return customizingAvatar === "female"
      ? FEMALE_CUSTOMIZATION_OPTIONS
      : MALE_CUSTOMIZATION_OPTIONS;
  };

  const getCurrentCustomization = () => {
    return storeCustomization;
  };

  const getAvatarCustomization = (id) => {
    // If we are currently customizing THIS avatar, use store values
    if (customizingAvatar === id) {
      return storeCustomization;
    }

    // Otherwise return default or stored customization
    // For simplicity in selection screen, we show default or the active store one if it matches gender
    return storeCustomization;
  };

  // Inline styles replaced with CSS classes in avatarselection.css
  return (
    <div className="avatar-selection-page">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
          
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes scaleIn {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>

      {notification && <div className="avatar-notification">{notification}</div>}
      <div
        className={`avatar-overlay ${customizingAvatar ? 'active' : ''}`}
        onClick={closeCustomization}
      />

      <nav className="avatar-navbar">
        <div className="avatar-nav-left">
          <button
            className="avatar-back-btn"
            onClick={() => navigate("/virtual-try-on")}
          >
            <FaArrowLeft /> <span>Back</span>
          </button>
          <h1 className="avatar-logo">Avatar Customization</h1>
        </div>
        <div className="avatar-nav-right">
          <button className="avatar-confirm-btn" onClick={handleConfirmSelection}>
            <FaCheck /> <span>Confirm & Save</span>
          </button>
        </div>
      </nav>

      <div className="avatar-content">
        <div className="avatar-header-section">
          <h2 className="avatar-main-title">Design Your Perfect Avatar</h2>
          <p className="avatar-main-subtitle">
            Personalize every detail to match your unique style
          </p>
        </div>

        <div className="avatar-main-content">
          <div className="avatar-grid-wrapper">
            {avatars.map((avatar) => {
              const isSelected = selectedAvatar === avatar.id;
              const isHovered = hoveredCard === avatar.id;
              const isCustomizing = customizingAvatar === avatar.id;
              const Icon = avatar.icon;
              const avatarCustomization = getAvatarCustomization(avatar.id);

              return (
                <div
                  key={avatar.id}
                  className={`avatar-card ${isSelected ? 'selected' : ''}`}
                  style={{
                    opacity: customizingAvatar && !isCustomizing ? 0.3 : 1,
                    pointerEvents:
                      customizingAvatar && !isCustomizing ? "none" : "all",
                  }}
                  onMouseEnter={() => setHoveredCard(avatar.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className="avatar-canvas-container">
                    {isSelected && (
                      <div className="selected-badge">
                        <FaCheck size={13} /> Selected
                      </div>
                    )}

                    <div
                      className={`rotate-hint ${isHovered ? 'visible' : ''}`}
                    >
                      <FaRedo size={11} /> Drag to rotate
                    </div>

                    <Suspense
                      fallback={
                        <div className="avatar-loading-fallback">
                          <div className="avatar-spinner" />
                          <span className="avatar-loading-text">
                            Loading Avatar...
                          </span>
                        </div>
                      }
                    >
                      <Canvas
                        style={{ width: "100%", height: "100%" }}
                        gl={{
                          antialias: true,
                          alpha: true,
                          preserveDrawingBuffer: false,
                          powerPreference: "high-performance",
                          failIfMajorPerformanceCaveat: false,
                        }}
                        key={`${avatar.id}-stable-canvas`}
                      >
                        <PerspectiveCamera
                          makeDefault
                          position={avatar.cameraPosition}
                          fov={45}
                        />
                        <ambientLight intensity={0.8} />
                        <directionalLight
                          position={[5, 8, 5]}
                          intensity={1.3}
                          castShadow
                        />
                        <directionalLight
                          position={[-5, 5, -5]}
                          intensity={0.5}
                        />
                        <spotLight
                          position={[0, 10, 0]}
                          intensity={0.4}
                          angle={0.4}
                          penumbra={1}
                        />
                        <pointLight position={[0, 2, 2]} intensity={0.3} />

                        <Suspense fallback={null}>
                          <RealisticAvatar
                            gender={avatar.id}
                            customization={avatarCustomization}
                            key={`avatar-${avatar.id}-${rerenderKey}`}
                          />
                          <Environment preset="studio" />
                        </Suspense>

                        <OrbitControls
                          target={avatar.targetPosition}
                          enablePan={false}
                          enableZoom={false}
                          autoRotate={!isHovered}
                          autoRotateSpeed={1.5}
                          minPolarAngle={Math.PI / 3}
                          maxPolarAngle={Math.PI / 2}
                          minAzimuthAngle={-Math.PI / 4}
                          maxAzimuthAngle={Math.PI / 4}
                          enableDamping
                          dampingFactor={0.05}
                        />
                      </Canvas>
                    </Suspense>
                  </div>

                  <div className="avatar-info">
                    <div className="avatar-header">
                      <div className="avatar-name-group">
                        <div
                          className={`avatar-icon-wrapper ${isSelected ? 'selected' : ''}`}
                        >
                          <Icon
                            size={24}
                            color={isSelected ? "#FFFFFF" : "#667eea"}
                          />
                        </div>
                        <h3 className="avatar-name">{avatar.name}</h3>
                      </div>
                      {isSelected && (
                        <div className="avatar-check-icon">
                          <FaCheck size={16} />
                        </div>
                      )}
                    </div>
                    <p className="avatar-description">{avatar.description}</p>
                    <div className="avatar-button-group">
                      <button
                        className="avatar-customize-btn-card"
                        onClick={() => openCustomization(avatar.id)}
                      >
                        <FaPalette /> Customize
                      </button>
                      <button
                        className={`avatar-select-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() =>
                          !isSelected && handleSelectAvatar(avatar.id)
                        }
                      >
                        {isSelected ? (
                          <>
                            <FaCheck /> Selected
                          </>
                        ) : (
                          <>
                            <Icon /> Select Avatar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`customization-panel ${customizingAvatar ? 'active' : ''}`}>
        <div className="panel-header">
          <div className="panel-header-left">
            <h3 className="panel-title">
              {customizingAvatar === "male" ? "🧔 Male" : "👩 Female"} Avatar
            </h3>
            <p className="panel-subtitle">
              {getCustomizationOptions()[activeCategory]?.name}
            </p>
          </div>
          <button className="close-button" onClick={closeCustomization}>
            <FaTimes size={20} />
          </button>
        </div>
        <div className="category-bar">
          {Object.entries(getCustomizationOptions()).map(([key, category]) => {
            const Icon = category.icon;
            const isActive = activeCategory === key;
            const isLocked = !FREE_CATEGORIES.includes(key);

            return (
              <div
                key={key}
                className={`category-tab ${isActive ? 'active' : ''}`}
                style={{
                  opacity: isLocked ? 0.4 : 1,
                  cursor: isLocked ? "not-allowed" : "pointer",
                }}
                onClick={() => !isLocked && setActiveCategory(key)}
              >
                <Icon
                  style={{
                    color: isActive ? "#FFFFFF" : "#666666",
                    fontSize: "20px"
                  }}
                />
                <span
                  style={{
                    color: isActive ? "#FFFFFF" : "#1a1a1a",
                    fontSize: "10px",
                    fontWeight: "700",
                    textAlign: "center"
                  }}
                >
                  {category.name} {isLocked && "🔒"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="options-container">
          <h4 className="section-title">
            {getCustomizationOptions()[activeCategory]?.name}
          </h4>
          <div className="options-grid">
            {getCustomizationOptions()[activeCategory]?.options.map((option) => {
              const currentCustomization = getCurrentCustomization();
              const isSelected = currentCustomization[activeCategory] === option.id;
              const isLocked = !FREE_CATEGORIES.includes(activeCategory);

              return (
                <div
                  key={option.id}
                  className={`option-card ${isSelected ? 'selected' : ''}`}
                  style={{
                    opacity: isLocked ? 0.4 : 1,
                    cursor: isLocked ? "not-allowed" : "pointer",
                  }}
                  onClick={() =>
                    !isLocked && handleCustomizationSelect(activeCategory, option.id)
                  }
                >
                  {isSelected && (
                    <div className="check-mark">
                      <FaCheck />
                    </div>
                  )}

                  <div className="option-content">
                    {option.color ? (
                      <div
                        className="color-swatch"
                        style={{
                          backgroundColor: option.color,
                        }}
                      />
                    ) : option.emoji ? (
                      <div className="option-emoji">{option.emoji}</div>
                    ) : null}

                    <div className="option-name">{option.name}</div>

                    {option.description && (
                      <div className="option-description">
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelectionPage;

