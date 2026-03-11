// src/utils/avatarOutfitSystem.js
import * as THREE from 'three';
import ColorThief from 'colorthief';

// ✅ Configuration for outfit categories
const OUTFIT_CONFIGURATION = {
  'tshirts': {
    applyTo: ['Wolf3D_Outfit_Top'],
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Bottom', 'Wolf3D_Outfit_Footwear'],
    layer: 1
  },
  'shirts': {
    applyTo: ['Wolf3D_Outfit_Top'],
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Bottom', 'Wolf3D_Outfit_Footwear'],
    layer: 1
  },
  'top': {
    applyTo: ['Wolf3D_Outfit_Top'],
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Bottom', 'Wolf3D_Outfit_Footwear'],
    layer: 1
  },
  'jacket': {
    applyTo: ['Wolf3D_Outfit_Top'],
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Bottom', 'Wolf3D_Outfit_Footwear'],
    layer: 2
  },
  'jackets': {
    applyTo: ['Wolf3D_Outfit_Top'],
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Bottom', 'Wolf3D_Outfit_Footwear'],
    layer: 2
  },
  'bottom': {
    applyTo: ['Wolf3D_Outfit_Bottom'],
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Top', 'Wolf3D_Outfit_Footwear'],
    layer: 1
  },
  'pants': {
    applyTo: ['Wolf3D_Outfit_Bottom'],
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Top', 'Wolf3D_Outfit_Footwear'],
    layer: 1
  },
  'dress': {
    applyTo: ['Wolf3D_Outfit_Top', 'Wolf3D_Outfit_Bottom'],
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Footwear'],
    layer: 1,
    fullBody: true
  },
  'dresses': {
    applyTo: ['Wolf3D_Outfit_Top', 'Wolf3D_Outfit_Bottom'],
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Footwear'],
    layer: 1,
    fullBody: true
  },
  'shoes': {
    applyTo: ['Wolf3D_Outfit_Footwear'],
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Top', 'Wolf3D_Outfit_Bottom'],
    layer: 1
  },
  'bag': {
    applyTo: ['Wolf3D_Accessories'],
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Top', 'Wolf3D_Outfit_Bottom', 'Wolf3D_Outfit_Footwear'],
    layer: 3
  },
  'accessories': {
    applyTo: ['Wolf3D_Accessories'],
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Top', 'Wolf3D_Outfit_Bottom', 'Wolf3D_Outfit_Footwear'],
    layer: 3
  }
};

// ✅ Store applied products
const currentOutfit = {
  top: null,
  bottom: null,
  footwear: null,
  dress: null,
  jacket: null,
  bag: null,
  accessories: []
};

// ✅ Normalize category names
const normalizeCategory = (category) => {
  if (!category) return null;

  const lower = category.toLowerCase().trim();

  const categoryMap = {
    'shirt': 'shirts',
    'shirts': 'shirts',
    'tshirt': 'tshirts',
    't-shirt': 'tshirts',
    't-shirts': 'tshirts',
    'tshirts': 'tshirts',
    'top': 'top',
    'tops': 'top',
    'jacket': 'jackets',
    'jackets': 'jackets',
    'pant': 'bottom',
    'pants': 'bottom',
    'bottom': 'bottom',
    'bottoms': 'bottom',
    'dress': 'dresses',
    'dresses': 'dresses',
    'shoes': 'shoes',
    'shoe': 'shoes',
    'bag': 'bag',
    'bags': 'bag',
    'accessory': 'accessories',
    'accessories': 'accessories',
  };

  return categoryMap[lower] || lower;
};

/**
 * ✅ MAIN FUNCTION: Apply outfit to avatar using color extraction
 */
export const applyOutfitToAvatar = (product, avatarRef) => {
  if (!avatarRef || !avatarRef.current) {
    console.error('❌ No avatar reference');
    return false;
  }

  if (!product || !product.category) {
    console.error('❌ Invalid product - missing category');
    return false;
  }

  console.log('\n🎨 =====================================');
  console.log('🎨 SMART COLOR EXTRACTION MODE');
  console.log('🎨 =====================================');
  console.log('📦 Product:', product.name);
  console.log('🏷️  Category (original):', product.category);

  const normalizedCategory = normalizeCategory(product.category);
  const config = OUTFIT_CONFIGURATION[normalizedCategory];

  console.log('🏷️  Category (normalized):', normalizedCategory);

  if (!config) {
    console.error('❌ Category not supported:', product.category);
    console.log('💡 Available:', Object.keys(OUTFIT_CONFIGURATION).join(', '));
    return false;
  }

  const applied = extractColorWithColorThief(config.applyTo, product, avatarRef);

  if (!applied) {
    console.error('❌ Failed to apply color');
    return false;
  }

  // Handle visibility
  setMeshVisibility(config.hideBodyParts, false, avatarRef);
  setMeshVisibility(config.showBodyParts, true, avatarRef);

  // Track product
  trackProduct(normalizedCategory, product);

  console.log('🎉 Application complete!\n');

  return true;
};

/**
 * ✅ ENHANCED: Extract dominant color with smarter algorithm
 */
const extractColorWithColorThief = (targetMeshNames, product, avatarRef) => {
  const imageUrl = product.image || product.imageUrl;

  if (!imageUrl) {
    console.error('❌ No image URL in product');
    return false;
  }

  console.log('⏳ Analyzing product image...');

  // Find target meshes
  const foundMeshes = [];
  avatarRef.current.traverse((child) => {
    if (child.isMesh && targetMeshNames.includes(child.name)) {
      foundMeshes.push(child);
    }
  });

  if (foundMeshes.length === 0) {
    console.error('❌ No meshes found for:', targetMeshNames);
    return false;
  }

  console.log(`✅ Found ${foundMeshes.length} mesh(es):`, foundMeshes.map(m => m.name).join(', '));

  const img = new Image();
  img.crossOrigin = 'Anonymous';

  img.onload = () => {
    try {
      const colorThief = new ColorThief();
      const palette = colorThief.getPalette(img, 15, 10); // ✅ Extract more colors

      console.log('📊 Extracted 15 colors for analysis');

      const garmentColors = [];

      // ✅ IMPROVED: Better background detection
      for (let i = 0; i < palette.length; i++) {
        const color = palette[i];
        const r = color[0];
        const g = color[1];
        const b = color[2];
        const brightness = (r + g + b) / 3;
        const maxChannel = Math.max(r, g, b);
        const minChannel = Math.min(r, g, b);
        const saturation = maxChannel - minChannel;

        const hex = rgbToHex(r, g, b);

        // // ✅ ENHANCED background detection
        // const isPureWhite = brightness > 250;
        // const isOffWhite = brightness > 240 && saturation < 15;
        // const isLightGray = brightness > 230 && saturation < 20;
        // const isCream = brightness > 235 && r > 230 && g > 230;
        // const isBeige = brightness > 220 && saturation < 25 && r > g && r > b;
        // const isVeryLight = brightness > 240;

        // const isBackground = isPureWhite || isOffWhite || isLightGray || isCream || isBeige || isVeryLight;
        const isPureWhite = brightness > 245;
        const isOffWhite = brightness > 225 && saturation < 20;
        const isLightGray = brightness > 210 && saturation < 15;
        const isCream = brightness > 220 && r > 210 && g > 205 && b > 190 && saturation < 30;
        const isBeige = brightness > 200 && saturation < 30 && r > g && r > b && r > 190;
        const isVeryLight = brightness > 235 && saturation < 12;

        // ✅ NEW: catch grey-green, grey-blue bg shades
        const isNeutralBg = brightness > 200 && saturation < 18;

        const isBackground = isPureWhite || isOffWhite || isLightGray || isCream || isBeige || isVeryLight || isNeutralBg;
        console.log(`${String(i + 1).padStart(2)}. ${hex} Bright:${String(Math.round(brightness)).padStart(3)} Sat:${String(Math.round(saturation)).padStart(3)} ${isBackground ? 'BG' : 'GARMENT'}`);

        if (!isBackground) {
          garmentColors.push({
            r: r,
            g: g,
            b: b,
            brightness: brightness,
            saturation: saturation,
            hex: hex,
            index: i
          });
        }
      }

      // ✅ Fallback if all filtered
      if (garmentColors.length === 0) {
        console.warn('⚠️ All colors filtered as background!');
        console.log('💡 Using darkest available color');

        let darkest = palette[0];
        let minBright = 255;

        for (let i = 0; i < palette.length; i++) {
          const color = palette[i];
          const bright = (color[0] + color[1] + color[2]) / 3;
          if (bright < minBright) {
            minBright = bright;
            darkest = color;
          }
        }

        // ✅ Apply moderate darkening
        const factor = 0.5;
        const color = new THREE.Color(
          (darkest[0] / 255) * factor,
          (darkest[1] / 255) * factor,
          (darkest[2] / 255) * factor
        );

        applyColorToMeshes(foundMeshes, color);
        return;
      }

      console.log(`✅ Valid garment colors: ${garmentColors.length}`);

      // ✅ IMPROVED: Smarter color selection algorithm
      let bestColor = garmentColors[0];
      let bestScore = 0;

      for (let i = 0; i < garmentColors.length; i++) {
        const color = garmentColors[i];
        let score = 0;

        // ✅ Prefer colors with good saturation
        score += color.saturation * 6;

        // ✅ Prefer colors that appear early in palette (more prominent)
        score += (15 - color.index) * 5;

        // ✅ Prefer medium to dark colors (better for fabric)
        if (color.brightness >= 60 && color.brightness <= 180) {
          score += 100; // Sweet spot for fabric colors
        } else if (color.brightness < 60) {
          score += 80; // Very dark is good too
        } else if (color.brightness < 200) {
          score += 50; // Somewhat bright okay
        } else {
          score += 20; // Too bright, penalize
        }

        // ✅ Bonus for saturated colors
        if (color.saturation > 50) {
          score += 30;
        }

        console.log(`   Color ${i + 1}: ${color.hex} Score: ${score}`);

        if (score > bestScore) {
          bestScore = score;
          bestColor = color;
        }
      }

      console.log('🎯 SELECTED:', bestColor.hex, 'Brightness:', Math.round(bestColor.brightness), 'Score:', bestScore);

      // ✅ IMPROVED: Smart darkening based on brightness
      let finalR = bestColor.r;
      let finalG = bestColor.g;
      let finalB = bestColor.b;

      // let darkenFactor;
      // let darkenPercent;

      // if (bestColor.brightness > 180) {
      //   darkenFactor = 0.4; // 60% darker
      //   darkenPercent = 60;
      // } else if (bestColor.brightness > 150) {
      //   darkenFactor = 0.5; // 50% darker
      //   darkenPercent = 50;
      // } else if (bestColor.brightness > 120) {
      //   darkenFactor = 0.6; // 40% darker
      //   darkenPercent = 40;
      // } else if (bestColor.brightness > 80) {
      //   darkenFactor = 0.7; // 30% darker
      //   darkenPercent = 30;
      // } else if (bestColor.brightness > 50) {
      //   darkenFactor = 0.8; // 20% darker
      //   darkenPercent = 20;
      // } else {
      //   darkenFactor = 0.9; // 10% darker
      //   darkenPercent = 10;
      // }

      // finalR = Math.round(finalR * darkenFactor);
      // finalG = Math.round(finalG * darkenFactor);
      // finalB = Math.round(finalB * darkenFactor);

      // console.log(`🔧 Applied ${darkenPercent}% darkening for realistic fabric appearance`);

      // ✅ NEW: Minimal darkening - preserve actual garment color
      // Only slightly darken very bright colors, keep dark/medium colors as-i
      let darkenFactor = 1.0; // Default: no change

      if (bestColor.brightness > 200) {
        darkenFactor = 0.88; // Very light colors: 12% darker
      } else if (bestColor.brightness > 160) {
        darkenFactor = 0.93; // Light-medium: 7% darker  
      } else {
        darkenFactor = 1.0;  // Medium/dark: keep exact color
      }

      finalR = Math.round(finalR * darkenFactor);
      finalG = Math.round(finalG * darkenFactor);
      finalB = Math.round(finalB * darkenFactor);

      console.log(`🔧 Applied ${Math.round((1 - darkenFactor) * 100)}% minimal darkening`);
      const finalHex = rgbToHex(finalR, finalG, finalB);
      const finalBright = (finalR + finalG + finalB) / 3;

      console.log('✨ FINAL COLOR:', finalHex, 'Brightness:', Math.round(finalBright));

      // ✅ Convert to linear color space with proper gamma correction
      const gammaR = Math.pow(finalR / 255, 2.2);
      const gammaG = Math.pow(finalG / 255, 2.2);
      const gammaB = Math.pow(finalB / 255, 2.2);

      const finalColor = new THREE.Color(gammaR, gammaG, gammaB);

      applyColorToMeshes(foundMeshes, finalColor);

    } catch (error) {
      console.error('❌ Color extraction error:', error);
      console.log('💡 Using fallback color');
      const fallback = new THREE.Color(0.15, 0.15, 0.18); // Dark gray-blue
      applyColorToMeshes(foundMeshes, fallback);
    }
  };

  img.onerror = (error) => {
    console.error('❌ Image load failed:', error);
    console.log('💡 Using fallback color');
    const fallback = new THREE.Color(0.15, 0.15, 0.18); // Dark gray-blue
    applyColorToMeshes(foundMeshes, fallback);
  };

  img.src = imageUrl;

  return true;
};

/**
 * ✅ Convert RGB to HEX
 */
const rgbToHex = (r, g, b) => {
  const toHex = (x) => {
    const hex = Math.min(255, Math.max(0, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
};

/**
 * ✅ ENHANCED: Apply color with professional fabric material
 */
const applyColorToMeshes = (meshes, color) => {
  console.log(`\n🎨 Applying professional fabric material`);
  console.log(`🎨 Color: #${color.getHexString().toUpperCase()}`);
  console.log(`🎨 Meshes: ${meshes.length}`);

  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshes[i];

    // ✅ Dispose old material and textures
    if (mesh.material) {
      if (mesh.material.map) {
        mesh.material.map.dispose();
      }
      if (mesh.material.normalMap) {
        mesh.material.normalMap.dispose();
      }
      mesh.material.dispose();
    }

    // ✅ PROFESSIONAL: Create fabric-like material with enhanced properties
    const material = new THREE.MeshStandardMaterial({
      color: color,

      // ✅ Fabric properties
      metalness: 0.0,           // No metallic shine (fabric, not metal)
      roughness: 0.85,          // High roughness for cloth texture

      // ✅ Subtle improvements for realism
      envMapIntensity: 0.15,    // Subtle environmental reflection
      emissive: new THREE.Color(color).multiplyScalar(0.03), // Very subtle self-illumination
      emissiveIntensity: 0.08,  // Subtle glow

      // ✅ Rendering properties
      side: THREE.DoubleSide,   // Render both sides
      flatShading: false,       // Smooth shading
      transparent: false,
      opacity: 1.0,

      // ✅ Advanced properties
      depthWrite: true,
      depthTest: true,
    });

    mesh.material = material;
    mesh.material.needsUpdate = true;
    mesh.visible = true;

    console.log(`   ✅ Applied to ${mesh.name}`);
  }

  console.log('✅ Material application complete!\n');
};

/**
 * ✅ Set mesh visibility
 */
const setMeshVisibility = (meshNames, visible, avatarRef) => {
  if (!meshNames || meshNames.length === 0) return;

  let count = 0;
  avatarRef.current.traverse((child) => {
    if (child.isMesh && meshNames.includes(child.name)) {
      child.visible = visible;
      count++;
    }
  });

  if (count > 0) {
    console.log(`   ${visible ? '👁️' : '👻'} ${count} mesh(es) ${visible ? 'visible' : 'hidden'}`);
  }
};

/**
 * ✅ Track applied product
 */
const trackProduct = (category, product) => {
  console.log('📦 Tracking product in outfit state...');

  // Map to outfit slots
  if (category === 'dresses') {
    currentOutfit.dress = product;
    currentOutfit.top = null;
    currentOutfit.bottom = null;
    console.log('   ✅ Tracked as: dress');
  } else if (['tshirts', 'shirts', 'top', 'jackets'].includes(category)) {
    if (category === 'jackets') {
      currentOutfit.jacket = product;
    } else {
      currentOutfit.top = product;
    }
    currentOutfit.dress = null;
    console.log(`   ✅ Tracked as: ${category === 'jackets' ? 'jacket' : 'top'}`);
  } else if (['bottom', 'pants'].includes(category)) {
    currentOutfit.bottom = product;
    currentOutfit.dress = null;
    console.log('   ✅ Tracked as: bottom');
  } else if (category === 'shoes') {
    currentOutfit.footwear = product;
    console.log('   ✅ Tracked as: footwear');
  } else if (category === 'bag') {
    currentOutfit.bag = product;
    console.log('   ✅ Tracked as: bag');
  } else if (category === 'accessories') {
    const exists = currentOutfit.accessories.findIndex(item =>
      (item.id === product.id) || (item._id === product._id)
    );
    if (exists === -1) {
      currentOutfit.accessories.push(product);
      console.log('   ✅ Tracked as: accessory');
    } else {
      console.log('   ℹ️  Already tracked');
    }
  }

  console.log('📊 Current outfit:', {
    top: currentOutfit.top?.name || 'none',
    bottom: currentOutfit.bottom?.name || 'none',
    dress: currentOutfit.dress?.name || 'none',
    jacket: currentOutfit.jacket?.name || 'none',
    footwear: currentOutfit.footwear?.name || 'none',
    bag: currentOutfit.bag?.name || 'none',
    accessories: currentOutfit.accessories.length
  });
};

/**
 * ✅ Remove specific outfit item
 */
export const removeOutfitItem = (category, avatarRef) => {
  if (!avatarRef || !avatarRef.current) return false;

  const normalizedCategory = normalizeCategory(category);
  const config = OUTFIT_CONFIGURATION[normalizedCategory];

  if (!config) return false;

  console.log('🗑️ Removing:', category);

  // Hide meshes
  for (let i = 0; i < config.applyTo.length; i++) {
    const meshName = config.applyTo[i];
    avatarRef.current.traverse((child) => {
      if (child.isMesh && child.name === meshName) {
        child.visible = false;

        // Dispose material
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    });
  }

  // Restore hidden body parts
  setMeshVisibility(config.hideBodyParts, true, avatarRef);

  // Clear from outfit state
  if (normalizedCategory === 'dresses') {
    currentOutfit.dress = null;
  } else if (['tshirts', 'shirts', 'top'].includes(normalizedCategory)) {
    currentOutfit.top = null;
  } else if (normalizedCategory === 'jackets') {
    currentOutfit.jacket = null;
  } else if (['bottom', 'pants'].includes(normalizedCategory)) {
    currentOutfit.bottom = null;
  } else if (normalizedCategory === 'shoes') {
    currentOutfit.footwear = null;
  } else if (normalizedCategory === 'bag') {
    currentOutfit.bag = null;
  }

  console.log('✅ Removed successfully');

  return true;
};

/**
 * ✅ Reset avatar to default
 */
export const resetAvatarToDefault = (avatarRef) => {
  if (!avatarRef || !avatarRef.current) {
    console.error('❌ No avatar reference');
    return false;
  }

  console.log('\n🔄 =====================================');
  console.log('🔄 RESETTING AVATAR TO DEFAULT');
  console.log('🔄 =====================================');

  let count = 0;

  avatarRef.current.traverse((child) => {
    if (child.isMesh) {
      // Show body
      if (child.name === 'Wolf3D_Body') {
        child.visible = true;
      }

      // Hide and clean all outfit parts
      if (child.name.includes('Wolf3D_Outfit') || child.name.includes('Wolf3D_Accessories')) {
        child.visible = false;
        count++;

        // Dispose materials and textures
        if (child.material) {
          if (child.material.map) {
            child.material.map.dispose();
          }
          if (child.material.normalMap) {
            child.material.normalMap.dispose();
          }
          child.material.dispose();
        }

        console.log(`   🧹 Cleaned: ${child.name}`);
      }
    }
  });

  // Clear outfit state
  currentOutfit.top = null;
  currentOutfit.bottom = null;
  currentOutfit.footwear = null;
  currentOutfit.dress = null;
  currentOutfit.jacket = null;
  currentOutfit.bag = null;
  currentOutfit.accessories = [];

  console.log(`✅ Reset complete - ${count} parts cleaned and hidden`);
  console.log('=====================================\n');

  return true;
};

/**
 * ✅ Get current outfit state
 */
export const getCurrentOutfit = () => {
  return {
    top: currentOutfit.top,
    bottom: currentOutfit.bottom,
    footwear: currentOutfit.footwear,
    dress: currentOutfit.dress,
    jacket: currentOutfit.jacket,
    bag: currentOutfit.bag,
    accessories: currentOutfit.accessories.slice()
  };
};

/**
 * ✅ Get all applied products as array (for cart)
 */
export const getAllAppliedProducts = () => {
  const products = [];

  if (currentOutfit.top) products.push(currentOutfit.top);
  if (currentOutfit.bottom) products.push(currentOutfit.bottom);
  if (currentOutfit.dress) products.push(currentOutfit.dress);
  if (currentOutfit.footwear) products.push(currentOutfit.footwear);
  if (currentOutfit.jacket) products.push(currentOutfit.jacket);
  if (currentOutfit.bag) products.push(currentOutfit.bag);

  products.push(...currentOutfit.accessories);

  console.log(`📦 Retrieved ${products.length} applied product(s)`);

  return products;
};

/**
 * ✅ Get count of applied items
 */
export const getAppliedProductsCount = () => {
  let count = 0;

  if (currentOutfit.top) count++;
  if (currentOutfit.bottom) count++;
  if (currentOutfit.dress) count++;
  if (currentOutfit.footwear) count++;
  if (currentOutfit.jacket) count++;
  if (currentOutfit.bag) count++;

  count += currentOutfit.accessories.length;

  return count;
};

/**
 * ✅ Check if product is applied
 */
export const isProductApplied = (productId) => {
  const allProducts = getAllAppliedProducts();
  return allProducts.some(product =>
    product.id === productId || product._id === productId
  );
};

/**
 * ✅ Get compatible categories for an item
 */
export const getCompatibleCategories = (currentCategory) => {
  const normalizedCat = normalizeCategory(currentCategory);

  const compatibility = {
    'tshirts': ['bottom', 'pants', 'shoes', 'jackets', 'accessories', 'bag'],
    'shirts': ['bottom', 'pants', 'shoes', 'jackets', 'accessories', 'bag'],
    'top': ['bottom', 'pants', 'shoes', 'jackets', 'accessories', 'bag'],
    'jackets': ['tshirts', 'shirts', 'top', 'bottom', 'pants', 'shoes', 'accessories', 'bag'],
    'bottom': ['tshirts', 'shirts', 'top', 'jackets', 'shoes', 'accessories', 'bag'],
    'pants': ['tshirts', 'shirts', 'top', 'jackets', 'shoes', 'accessories', 'bag'],
    'dresses': ['shoes', 'accessories', 'bag'],
    'shoes': ['tshirts', 'shirts', 'top', 'jackets', 'bottom', 'pants', 'dresses', 'accessories', 'bag'],
    'bag': ['tshirts', 'shirts', 'top', 'jackets', 'bottom', 'pants', 'dresses', 'shoes', 'accessories'],
    'accessories': ['tshirts', 'shirts', 'top', 'jackets', 'bottom', 'pants', 'dresses', 'shoes', 'bag']
  };

  return compatibility[normalizedCat] || [];
};

/**
 * ✅ Check if category is supported
 */
export const isCategorySupported = (category) => {
  const normalized = normalizeCategory(category);
  return normalized in OUTFIT_CONFIGURATION;
};

/**
 * ✅ Get all supported categories
 */
export const getSupportedCategories = () => {
  return Object.keys(OUTFIT_CONFIGURATION);
};

/**
 * ✅ Debug: Log all avatar meshes
 */
export const debugLogAvatarMeshes = (avatarRef) => {
  if (!avatarRef || !avatarRef.current) {
    console.error('❌ No avatar reference');
    return;
  }

  console.log('\n🔍 =====================================');
  console.log('🔍 AVATAR DEBUG INFO');
  console.log('🔍 =====================================');

  const meshes = [];
  avatarRef.current.traverse((child) => {
    if (child.isMesh) {
      const hasUV = !!child.geometry.attributes.uv;
      const uvCount = child.geometry.attributes.uv?.count || 0;
      const color = child.material?.color
        ? '#' + child.material.color.getHexString()
        : 'N/A';
      const hasTexture = !!child.material?.map;

      meshes.push({
        name: child.name,
        visible: child.visible ? '✅' : '❌',
        hasUV: hasUV ? '✅' : '❌',
        uvCount: uvCount,
        hasTexture: hasTexture ? '✅' : '❌',
        color: color
      });
    }
  });

  console.table(meshes);
  console.log(`Total meshes: ${meshes.length}`);
  console.log('=====================================\n');

  return meshes;
};

// ✅ Exports
export { currentOutfit, OUTFIT_CONFIGURATION };

export default {
  applyOutfitToAvatar,
  removeOutfitItem,
  resetAvatarToDefault,
  getCompatibleCategories,
  getCurrentOutfit,
  getAllAppliedProducts,
  getAppliedProductsCount,
  isProductApplied,
  isCategorySupported,
  getSupportedCategories,
  debugLogAvatarMeshes,
  currentOutfit,
  OUTFIT_CONFIGURATION
};



// rebuild 
