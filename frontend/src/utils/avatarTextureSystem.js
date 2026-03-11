// src/utils/avatarTextureSystem.js
import * as THREE from 'three';

// ✅ Configuration for each product category
const OUTFIT_CONFIGURATION = {
  'Shirts': {
    applyTo: ['Wolf3D_Outfit_Top'],
    uvScale: { x: 1, y: 1 },
    uvOffset: { x: 0, y: 0 },
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Bottom', 'Wolf3D_Outfit_Footwear'],
    layer: 1
  },
  'T-Shirts': {
    applyTo: ['Wolf3D_Outfit_Top'],
    uvScale: { x: 1, y: 1 },
    uvOffset: { x: 0, y: 0 },
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Bottom', 'Wolf3D_Outfit_Footwear'],
    layer: 1
  },
  'Tops': {
    applyTo: ['Wolf3D_Outfit_Top'],
    uvScale: { x: 1, y: 1 },
    uvOffset: { x: 0, y: 0 },
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Bottom', 'Wolf3D_Outfit_Footwear'],
    layer: 1
  },
  'Jackets': {
    applyTo: ['Wolf3D_Outfit_Top'],
    uvScale: { x: 1, y: 1.2 },
    uvOffset: { x: 0, y: 0 },
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Bottom', 'Wolf3D_Outfit_Footwear'],
    layer: 2
  },
  'Coats': {
    applyTo: ['Wolf3D_Outfit_Top'],
    uvScale: { x: 1, y: 1.2 },
    uvOffset: { x: 0, y: 0 },
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Bottom', 'Wolf3D_Outfit_Footwear'],
    layer: 2
  },
  'Pants': {
    applyTo: ['Wolf3D_Outfit_Bottom'],
    uvScale: { x: 1, y: 1.5 },
    uvOffset: { x: 0, y: 0 },
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Top', 'Wolf3D_Outfit_Footwear'],
    layer: 1
  },
  'Bottoms': {
    applyTo: ['Wolf3D_Outfit_Bottom'],
    uvScale: { x: 1, y: 1.5 },
    uvOffset: { x: 0, y: 0 },
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Top', 'Wolf3D_Outfit_Footwear'],
    layer: 1
  },
  'Dresses': {
    applyTo: ['Wolf3D_Outfit_Top', 'Wolf3D_Outfit_Bottom'],
    uvScale: { x: 1, y: 2 },
    uvOffset: { x: 0, y: 0 },
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Footwear'],
    layer: 1,
    fullBody: true
  },
  'Kids Tops': {
    applyTo: ['Wolf3D_Outfit_Top'],
    uvScale: { x: 0.8, y: 0.8 },
    uvOffset: { x: 0, y: 0 },
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Bottom', 'Wolf3D_Outfit_Footwear'],
    layer: 1
  },
  'Kids Bottoms': {
    applyTo: ['Wolf3D_Outfit_Bottom'],
    uvScale: { x: 0.8, y: 1.2 },
    uvOffset: { x: 0, y: 0 },
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Top', 'Wolf3D_Outfit_Footwear'],
    layer: 1
  },
  'Kids Dresses': {
    applyTo: ['Wolf3D_Outfit_Top', 'Wolf3D_Outfit_Bottom'],
    uvScale: { x: 0.8, y: 1.5 },
    uvOffset: { x: 0, y: 0 },
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Footwear'],
    layer: 1,
    fullBody: true
  },
  'Kids Outerwear': {
    applyTo: ['Wolf3D_Outfit_Top'],
    uvScale: { x: 0.8, y: 0.9 },
    uvOffset: { x: 0, y: 0 },
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Bottom', 'Wolf3D_Outfit_Footwear'],
    layer: 2
  },
  'Accessories': {
    applyTo: ['Wolf3D_Accessories'],
    uvScale: { x: 1, y: 1 },
    uvOffset: { x: 0, y: 0 },
    hideBodyParts: [],
    showBodyParts: ['Wolf3D_Outfit_Top', 'Wolf3D_Outfit_Bottom', 'Wolf3D_Outfit_Footwear'],
    layer: 3
  }
};

// ✅ Track current outfit
const currentOutfit = {
  top: null,
  bottom: null,
  footwear: null,
  dress: null,
  jacket: null,
  accessories: []
};

// ✅ Texture loader instance
const textureLoader = new THREE.TextureLoader();

// ✅ Store loaded textures for cleanup
const loadedTextures = new Map();

// ✅ NEW: Normalize category names to match configuration
const normalizeCategory = (category) => {
  if (!category) return null;
  
  const lower = category.toLowerCase().trim();
  
  // Direct mapping of database categories to configuration keys
  const categoryMap = {
    // Shirts variations
    'shirt': 'Shirts',
    'shirts': 'Shirts',
    
    // T-Shirts variations
    'tshirt': 'T-Shirts',
    't-shirt': 'T-Shirts',
    't-shirts': 'T-Shirts',
    'tshirts': 'T-Shirts',
    
    // Tops variations
    'top': 'Tops',
    'tops': 'Tops',
    
    // Jackets variations
    'jacket': 'Jackets',
    'jackets': 'Jackets',
    
    // Coats variations
    'coat': 'Coats',
    'coats': 'Coats',
    
    // Pants variations
    'pant': 'Pants',
    'pants': 'Pants',
    
    // Bottoms variations
    'bottom': 'Bottoms',
    'bottoms': 'Bottoms',
    
    // Dresses variations
    'dress': 'Dresses',
    'dresses': 'Dresses',
    
    // Kids variations
    'kids top': 'Kids Tops',
    'kids tops': 'Kids Tops',
    'kids bottom': 'Kids Bottoms',
    'kids bottoms': 'Kids Bottoms',
    'kids dress': 'Kids Dresses',
    'kids dresses': 'Kids Dresses',
    'kids outerwear': 'Kids Outerwear',
    
    // Accessories variations
    'accessory': 'Accessories',
    'accessories': 'Accessories',
  };
  
  return categoryMap[lower] || category;
};

/**
 * Apply real texture from product image to avatar
 */
export const applyTextureToAvatar = (product, avatarRef) => {
  return new Promise((resolve) => {
    if (!avatarRef || !avatarRef.current) {
      console.error('❌ No avatar reference');
      resolve(false);
      return;
    }

    if (!product || !product.category) {
      console.error('❌ Invalid product - missing category');
      resolve(false);
      return;
    }

    // ✅ Normalize category
    const originalCategory = product.category;
    const normalizedCategory = normalizeCategory(originalCategory);
    const config = OUTFIT_CONFIGURATION[normalizedCategory];

    if (!config) {
      console.error('❌ Category not supported');
      console.error('   Original category:', originalCategory);
      console.error('   Normalized to:', normalizedCategory);
      console.log('💡 Available categories:', Object.keys(OUTFIT_CONFIGURATION));
      resolve(false);
      return;
    }

    console.log('\n🎨 =====================================');
    console.log('🎨 APPLYING TEXTURE TO AVATAR');
    console.log('🎨 =====================================');
    console.log('📦 Product:', product.name);
    console.log('🏷️  Category (database):', originalCategory);
    console.log('🏷️  Category (normalized):', normalizedCategory);
    console.log('🖼️  Image URL:', product.image || product.imageUrl);

    const imageUrl = product.image || product.imageUrl;
    
    if (!imageUrl) {
      console.error('❌ No image URL in product');
      resolve(false);
      return;
    }

    // ✅ Check if image is base64
    const isBase64 = imageUrl.startsWith('data:image');
    if (isBase64) {
      console.log('📸 Image format: Base64 (embedded)');
    } else {
      console.log('🌐 Image format: URL (external)');
    }

    // ✅ Find target meshes
    const foundMeshes = [];
    avatarRef.current.traverse((child) => {
      if (child.isMesh && config.applyTo.includes(child.name)) {
        foundMeshes.push(child);
        console.log('📍 Found target mesh:', child.name);
      }
    });

    if (foundMeshes.length === 0) {
      console.error('❌ No meshes found for:', config.applyTo);
      console.log('💡 Available meshes in avatar:');
      avatarRef.current.traverse((child) => {
        if (child.isMesh) {
          console.log('   -', child.name);
        }
      });
      resolve(false);
      return;
    }

    console.log(`✅ Found ${foundMeshes.length} mesh(es) to apply texture`);

    // ✅ Check for UV mapping
    const meshesWithoutUV = [];
    foundMeshes.forEach(mesh => {
      const hasUV = !!mesh.geometry.attributes.uv;
      const uvCount = mesh.geometry.attributes.uv?.count || 0;
      console.log(`📐 UV Check [${mesh.name}]: ${hasUV ? 'YES ✅' : 'NO ❌'} (${uvCount} vertices)`);
      
      if (!hasUV || uvCount === 0) {
        meshesWithoutUV.push(mesh.name);
      }
    });

    if (meshesWithoutUV.length > 0) {
      console.warn('⚠️ Meshes without UV coordinates:', meshesWithoutUV.join(', '));
      console.warn('💡 Textures cannot be applied without UVs - falling back to color system');
      resolve(false);
      return;
    }

    // ✅ Load texture
    console.log('⏳ Loading texture...');

    textureLoader.load(
      imageUrl,
      (texture) => {
        console.log('✅ Texture loaded successfully!');
        console.log('📊 Texture size:', texture.image.width, 'x', texture.image.height);

        // ✅ Configure texture for GLTF models
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(config.uvScale.x, config.uvScale.y);
        texture.offset.set(config.uvOffset.x, config.uvOffset.y);
        
        // Use colorSpace instead of encoding for newer Three.js versions
        if (texture.colorSpace !== undefined) {
          texture.colorSpace = THREE.SRGBColorSpace;
        } else {
          texture.encoding = THREE.sRGBEncoding;
        }
        
        texture.flipY = false; // Critical for GLTF models
        texture.needsUpdate = true;

        console.log('🔧 Texture configuration:');
        console.log('   - Repeat:', config.uvScale.x, 'x', config.uvScale.y);
        console.log('   - Offset:', config.uvOffset.x, ',', config.uvOffset.y);
        console.log('   - FlipY: false');

        // ✅ Apply texture to each mesh
        foundMeshes.forEach((mesh, index) => {
          console.log(`🎨 Applying to mesh ${index + 1}/${foundMeshes.length}: ${mesh.name}`);

          // Dispose old resources
          if (mesh.material) {
            if (mesh.material.map) {
              mesh.material.map.dispose();
            }
            mesh.material.dispose();
          }

          // Create new material with texture
          const material = new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 0.0,
            roughness: 0.9,
            side: THREE.DoubleSide,
            transparent: false,
            alphaTest: 0.5,
          });

          mesh.material = material;
          mesh.material.needsUpdate = true;
          mesh.visible = true;

          console.log('   ✅ Texture applied');
        });

        // Store texture for cleanup
        const textureKey = `${normalizedCategory}_${product.id || product._id}`;
        loadedTextures.set(textureKey, texture);

        // Handle visibility
        setMeshVisibility(config.hideBodyParts, false, avatarRef);
        setMeshVisibility(config.showBodyParts, true, avatarRef);

        // Track product
        trackProduct(normalizedCategory, product);

        console.log('\n🎉 =====================================');
        console.log('🎉 TEXTURE APPLIED SUCCESSFULLY!');
        console.log('🎉 =====================================\n');

        resolve(true);
      },
      (progress) => {
        if (progress.lengthComputable) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          console.log(`⏳ Loading: ${percent}%`);
        }
      },
      (error) => {
        console.error('\n❌ =====================================');
        console.error('❌ TEXTURE LOADING FAILED');
        console.error('❌ =====================================');
        console.error('Error:', error);
        console.error('Image URL:', imageUrl);
        console.error('Possible causes:');
        console.error('  1. CORS issue (external images must allow cross-origin)');
        console.error('  2. Invalid/corrupted base64 data');
        console.error('  3. Network error');
        console.error('  4. Unsupported image format');
        console.error('=====================================\n');
        
        resolve(false);
      }
    );
  });
};

/**
 * Set visibility of meshes by name
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
 * Track applied products
 */
const trackProduct = (category, product) => {
  const lower = category.toLowerCase();
  
  console.log('📦 Tracking product...');

  if (lower.includes('dress')) {
    currentOutfit.dress = product;
    currentOutfit.top = null;
    currentOutfit.bottom = null;
    console.log('   ✅ Tracked as: dress');
  } else if (lower.includes('shirt') || lower.includes('top') || lower.includes('jacket') || lower.includes('coat')) {
    currentOutfit.top = product;
    currentOutfit.dress = null;
    console.log('   ✅ Tracked as: top');
  } else if (lower.includes('pant') || lower.includes('bottom')) {
    currentOutfit.bottom = product;
    currentOutfit.dress = null;
    console.log('   ✅ Tracked as: bottom');
  } else if (lower.includes('accessories')) {
    const exists = currentOutfit.accessories.findIndex(item => 
      (item.id === product.id) || (item._id === product._id)
    );
    if (exists === -1) {
      currentOutfit.accessories.push(product);
      console.log('   ✅ Tracked as: accessory');
    }
  }

  console.log('📊 Current outfit:', {
    top: currentOutfit.top?.name || 'none',
    bottom: currentOutfit.bottom?.name || 'none',
    dress: currentOutfit.dress?.name || 'none',
    accessories: currentOutfit.accessories.length
  });
};

/**
 * Reset avatar to default
 */
export const resetAvatarTextures = (avatarRef) => {
  if (!avatarRef || !avatarRef.current) {
    console.error('❌ No avatar reference');
    return false;
  }

  console.log('\n🔄 =====================================');
  console.log('🔄 RESETTING AVATAR');
  console.log('🔄 =====================================');

  let resetCount = 0;

  avatarRef.current.traverse((child) => {
    if (child.isMesh) {
      if (child.name === 'Wolf3D_Body') {
        child.visible = true;
      }
      
      if (child.name.includes('Wolf3D_Outfit')) {
        child.visible = false;
        resetCount++;
        
        if (child.material) {
          if (child.material.map) {
            child.material.map.dispose();
          }
          child.material.dispose();
        }
      }
    }
  });

  // Clear cached textures
  loadedTextures.forEach((texture) => {
    texture.dispose();
  });
  loadedTextures.clear();

  // Clear outfit state
  currentOutfit.top = null;
  currentOutfit.bottom = null;
  currentOutfit.footwear = null;
  currentOutfit.dress = null;
  currentOutfit.jacket = null;
  currentOutfit.accessories = [];

  console.log(`✅ Reset complete - ${resetCount} parts hidden`);
  console.log('=====================================\n');

  return true;
};

/**
 * Get all applied products
 */
export const getAllAppliedProducts = () => {
  const products = [];
  
  if (currentOutfit.top) products.push(currentOutfit.top);
  if (currentOutfit.bottom) products.push(currentOutfit.bottom);
  if (currentOutfit.dress) products.push(currentOutfit.dress);
  if (currentOutfit.footwear) products.push(currentOutfit.footwear);
  if (currentOutfit.jacket) products.push(currentOutfit.jacket);
  
  products.push(...currentOutfit.accessories);
  
  return products;
};

/**
 * Get count of applied products
 */
export const getAppliedProductsCount = () => {
  let count = 0;
  
  if (currentOutfit.top) count++;
  if (currentOutfit.bottom) count++;
  if (currentOutfit.dress) count++;
  if (currentOutfit.footwear) count++;
  if (currentOutfit.jacket) count++;
  
  count += currentOutfit.accessories.length;
  
  return count;
};

/**
 * Check if product is applied
 */
export const isProductApplied = (productId) => {
  const allProducts = getAllAppliedProducts();
  return allProducts.some(product => 
    product.id === productId || product._id === productId
  );
};

/**
 * Debug: Log all meshes
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

export { currentOutfit, OUTFIT_CONFIGURATION };

export default {
  applyTextureToAvatar,
  resetAvatarTextures,
  getAllAppliedProducts,
  getAppliedProductsCount,
  isProductApplied,
  debugLogAvatarMeshes,
  currentOutfit,
  OUTFIT_CONFIGURATION
};



