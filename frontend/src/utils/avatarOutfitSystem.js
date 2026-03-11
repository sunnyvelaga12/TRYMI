// src/utils/avatarOutfitSystem.js
import * as THREE from 'three';

// Configuration for outfit categories
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

// Store applied products
const currentOutfit = {
  top: null,
  bottom: null,
  footwear: null,
  dress: null,
  jacket: null,
  bag: null,
  accessories: []
};

// Normalize category names - handles all DB formats including hyphenated
const normalizeCategory = (category) => {
  if (!category) return null;
  const lower = category.toLowerCase().trim();
  const categoryMap = {
    'shirt': 'shirts', 'shirts': 'shirts', 'kids-shirts': 'shirts', 'kids-shirt': 'shirts',
    'tshirt': 'tshirts', 't-shirt': 'tshirts', 't-shirts': 'tshirts', 'tshirts': 'tshirts',
    'kids-tshirt': 'tshirts', 'kids-tshirts': 'tshirts', 'kids t-shirts': 'tshirts',
    'top': 'top', 'tops': 'top', 'kids-top': 'top', 'kids-tops': 'top', 'kids tops': 'top',
    'jacket': 'jackets', 'jackets': 'jackets', 'kids-jacket': 'jackets', 'kids-jackets': 'jackets',
    'coat': 'jackets', 'coats': 'jackets', 'kids-coat': 'jackets', 'kids outerwear': 'jackets', 'kids-outerwear': 'jackets',
    'pant': 'bottom', 'pants': 'bottom', 'kids-pants': 'bottom', 'kids-pant': 'bottom',
    'bottom': 'bottom', 'bottoms': 'bottom', 'kids-bottom': 'bottom', 'kids-bottoms': 'bottom', 'kids bottoms': 'bottom',
    'dress': 'dresses', 'dresses': 'dresses', 'kids-dress': 'dresses', 'kids-dresses': 'dresses', 'kids dresses': 'dresses',
    'shoe': 'shoes', 'shoes': 'shoes',
    'bag': 'bag', 'bags': 'bag',
    'accessory': 'accessories', 'accessories': 'accessories', 'kids-accessories': 'accessories',
  };
  return categoryMap[lower] || lower;
};

// MAIN FUNCTION: Apply outfit to avatar using color extraction
export const applyOutfitToAvatar = (product, avatarRef) => {
  if (!avatarRef || !avatarRef.current) {
    console.error('No avatar reference');
    return false;
  }
  if (!product || !product.category) {
    console.error('Invalid product - missing category');
    return false;
  }

  const normalizedCategory = normalizeCategory(product.category);
  const config = OUTFIT_CONFIGURATION[normalizedCategory];

  console.log('Category:', product.category, '->', normalizedCategory);

  if (!config) {
    console.error('Category not supported:', product.category);
    console.log('Available:', Object.keys(OUTFIT_CONFIGURATION).join(', '));
    return false;
  }

  const applied = extractDominantColor(config.applyTo, product, avatarRef);
  if (!applied) return false;

  setMeshVisibility(config.hideBodyParts, false, avatarRef);
  setMeshVisibility(config.showBodyParts, true, avatarRef);
  trackProduct(normalizedCategory, product);

  return true;
};

// BEST APPROACH: Canvas center-crop pixel sampling
// Crops center 60% of image to avoid background, then finds most frequent non-background color
const extractDominantColor = (targetMeshNames, product, avatarRef) => {
  const imageUrl = product.image || product.imageUrl;
  if (!imageUrl) return false;

  const foundMeshes = [];
  avatarRef.current.traverse((child) => {
    if (child.isMesh && targetMeshNames.includes(child.name)) foundMeshes.push(child);
  });
  if (foundMeshes.length === 0) return false;

  const img = new Image();
  img.crossOrigin = 'Anonymous';

  img.onload = () => {
    try {
      // Step 1: Crop center 60% of image (avoids white/plain backgrounds)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const srcX = Math.floor(img.width * 0.2);
      const srcY = Math.floor(img.height * 0.1);
      const srcW = Math.floor(img.width * 0.6);
      const srcH = Math.floor(img.height * 0.7);
      canvas.width = srcW;
      canvas.height = srcH;
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

      // Step 2: Sample every 8th pixel and build color frequency buckets
      const data = ctx.getImageData(0, 0, srcW, srcH).data;
      const buckets = {};

      for (let i = 0; i < data.length; i += 32) { // every 8th pixel (4 channels * 8)
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 128) continue;

        const brightness = (r + g + b) / 3;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);

        // Skip backgrounds: white, off-white, light gray, neutral light
        if (brightness > 235) continue;
        if (brightness > 210 && sat < 20) continue;
        if (brightness > 190 && sat < 12) continue;

        // Quantize to 24-step buckets to group similar colors
        const rq = Math.round(r / 24) * 24;
        const gq = Math.round(g / 24) * 24;
        const bq = Math.round(b / 24) * 24;
        const key = `${rq},${gq},${bq}`;

        if (!buckets[key]) buckets[key] = { r: rq, g: gq, b: bq, count: 0, sat };
        buckets[key].count++;
      }

      // Step 3: Score colors by frequency + saturation bonus
      const colors = Object.values(buckets);

      if (colors.length === 0) {
        // Fallback: use darkest color from image
        let darkest = { r: 50, g: 50, b: 50 };
        let minBright = 255;
        for (let i = 0; i < data.length; i += 32) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const bright = (r + g + b) / 3;
          if (bright < minBright && bright > 10) {
            minBright = bright;
            darkest = { r, g, b };
          }
        }
        applyColorToMeshes(foundMeshes, new THREE.Color(darkest.r / 255, darkest.g / 255, darkest.b / 255));
        return;
      }

      colors.sort((a, b) => {
        // Score = frequency * (1 + saturation bonus)
        const scoreA = a.count * (1 + (a.sat > 40 ? 0.8 : a.sat > 20 ? 0.4 : 0));
        const scoreB = b.count * (1 + (b.sat > 40 ? 0.8 : b.sat > 20 ? 0.4 : 0));
        return scoreB - scoreA;
      });

      const best = colors[0];
      console.log(`Dominant color: rgb(${best.r},${best.g},${best.b}) count:${best.count} sat:${best.sat}`);

      // Step 4: Apply gamma correction and set on mesh
      const finalColor = new THREE.Color(
        Math.pow(best.r / 255, 2.2),
        Math.pow(best.g / 255, 2.2),
        Math.pow(best.b / 255, 2.2)
      );

      applyColorToMeshes(foundMeshes, finalColor);

    } catch (e) {
      console.error('Color extraction failed:', e);
      applyColorToMeshes(foundMeshes, new THREE.Color(0.15, 0.15, 0.18));
    }
  };

  img.onerror = () => {
    applyColorToMeshes(foundMeshes, new THREE.Color(0.15, 0.15, 0.18));
  };

  img.src = imageUrl;
  return true;
};

// Apply color with fabric-like material
const applyColorToMeshes = (meshes, color) => {
  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshes[i];
    if (mesh.material) {
      if (mesh.material.map) mesh.material.map.dispose();
      if (mesh.material.normalMap) mesh.material.normalMap.dispose();
      mesh.material.dispose();
    }
    mesh.material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.0,
      roughness: 0.85,
      envMapIntensity: 0.15,
      emissive: new THREE.Color(color).multiplyScalar(0.03),
      emissiveIntensity: 0.08,
      side: THREE.DoubleSide,
      transparent: false,
      opacity: 1.0,
    });
    mesh.material.needsUpdate = true;
    mesh.visible = true;
  }
};

// Set mesh visibility
const setMeshVisibility = (meshNames, visible, avatarRef) => {
  if (!meshNames || meshNames.length === 0) return;
  avatarRef.current.traverse((child) => {
    if (child.isMesh && meshNames.includes(child.name)) child.visible = visible;
  });
};

// Track applied product
const trackProduct = (category, product) => {
  if (category === 'dresses') {
    currentOutfit.dress = product;
    currentOutfit.top = null;
    currentOutfit.bottom = null;
  } else if (['tshirts', 'shirts', 'top'].includes(category)) {
    currentOutfit.top = product;
    currentOutfit.dress = null;
  } else if (category === 'jackets') {
    currentOutfit.jacket = product;
    currentOutfit.dress = null;
  } else if (['bottom', 'pants'].includes(category)) {
    currentOutfit.bottom = product;
    currentOutfit.dress = null;
  } else if (category === 'shoes') {
    currentOutfit.footwear = product;
  } else if (category === 'bag') {
    currentOutfit.bag = product;
  } else if (category === 'accessories') {
    const exists = currentOutfit.accessories.findIndex(
      item => (item.id === product.id) || (item._id === product._id)
    );
    if (exists === -1) currentOutfit.accessories.push(product);
  }
};

export const removeOutfitItem = (category, avatarRef) => {
  if (!avatarRef || !avatarRef.current) return false;
  const normalizedCategory = normalizeCategory(category);
  const config = OUTFIT_CONFIGURATION[normalizedCategory];
  if (!config) return false;

  for (let i = 0; i < config.applyTo.length; i++) {
    const meshName = config.applyTo[i];
    avatarRef.current.traverse((child) => {
      if (child.isMesh && child.name === meshName) {
        child.visible = false;
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      }
    });
  }

  setMeshVisibility(config.hideBodyParts, true, avatarRef);

  if (normalizedCategory === 'dresses') currentOutfit.dress = null;
  else if (['tshirts', 'shirts', 'top'].includes(normalizedCategory)) currentOutfit.top = null;
  else if (normalizedCategory === 'jackets') currentOutfit.jacket = null;
  else if (['bottom', 'pants'].includes(normalizedCategory)) currentOutfit.bottom = null;
  else if (normalizedCategory === 'shoes') currentOutfit.footwear = null;
  else if (normalizedCategory === 'bag') currentOutfit.bag = null;

  return true;
};

export const resetAvatarToDefault = (avatarRef) => {
  if (!avatarRef || !avatarRef.current) return false;

  avatarRef.current.traverse((child) => {
    if (child.isMesh) {
      if (child.name === 'Wolf3D_Body') child.visible = true;
      if (child.name.includes('Wolf3D_Outfit') || child.name.includes('Wolf3D_Accessories')) {
        child.visible = false;
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          if (child.material.normalMap) child.material.normalMap.dispose();
          child.material.dispose();
        }
      }
    }
  });

  currentOutfit.top = null;
  currentOutfit.bottom = null;
  currentOutfit.footwear = null;
  currentOutfit.dress = null;
  currentOutfit.jacket = null;
  currentOutfit.bag = null;
  currentOutfit.accessories = [];

  return true;
};

export const getCurrentOutfit = () => ({ ...currentOutfit, accessories: currentOutfit.accessories.slice() });

export const getAllAppliedProducts = () => {
  const products = [];
  if (currentOutfit.top) products.push(currentOutfit.top);
  if (currentOutfit.bottom) products.push(currentOutfit.bottom);
  if (currentOutfit.dress) products.push(currentOutfit.dress);
  if (currentOutfit.footwear) products.push(currentOutfit.footwear);
  if (currentOutfit.jacket) products.push(currentOutfit.jacket);
  if (currentOutfit.bag) products.push(currentOutfit.bag);
  products.push(...currentOutfit.accessories);
  return products;
};

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

export const isProductApplied = (productId) => {
  return getAllAppliedProducts().some(p => p.id === productId || p._id === productId);
};

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

export const isCategorySupported = (category) => normalizeCategory(category) in OUTFIT_CONFIGURATION;
export const getSupportedCategories = () => Object.keys(OUTFIT_CONFIGURATION);

export const debugLogAvatarMeshes = (avatarRef) => {
  if (!avatarRef || !avatarRef.current) return;
  const meshes = [];
  avatarRef.current.traverse((child) => {
    if (child.isMesh) {
      meshes.push({
        name: child.name,
        visible: child.visible ? 'YES' : 'NO',
        hasUV: child.geometry.attributes.uv ? 'YES' : 'NO',
        hasTexture: child.material?.map ? 'YES' : 'NO',
        color: child.material?.color ? '#' + child.material.color.getHexString() : 'N/A'
      });
    }
  });
  console.table(meshes);
  return meshes;
};

export { currentOutfit, OUTFIT_CONFIGURATION };

export default {
  applyOutfitToAvatar, removeOutfitItem, resetAvatarToDefault,
  getCompatibleCategories, getCurrentOutfit, getAllAppliedProducts,
  getAppliedProductsCount, isProductApplied, isCategorySupported,
  getSupportedCategories, debugLogAvatarMeshes, currentOutfit, OUTFIT_CONFIGURATION
};