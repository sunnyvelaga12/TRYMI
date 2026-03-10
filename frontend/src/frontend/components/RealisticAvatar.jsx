import { useGLTF } from '@react-three/drei';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { debugLogAvatarMeshes } from '../../utils/avatarOutfitSystem';

// ✅ Customization color mappings
const SKIN_TONE_COLORS = {
  porcelain: '#FFF5F0',
  fair: '#FFE4C4',
  light: '#F5CBA7',
  medium: '#D4A574',
  tan: '#C68642',
  olive: '#B08958',
  brown: '#8D5524',
  dark: '#5C4033',
  deep: '#3D2817',
  ebony: '#2C1810',
};

const HAIR_COLORS = {
  'jet-black': '#0C0C0C',
  'black': '#1C1C1C',
  'dark-brown': '#3D2817',
  'brown': '#654321',
  'light-brown': '#8B6914',
  'chestnut': '#954535',
  'auburn': '#A52A2A',
  'ginger': '#D2691E',
  'blonde': '#E6C28C',
  'dirty-blonde': '#C9A573',
  'platinum': '#E5E4E2',
  'gray': '#808080',
  'silver': '#C0C0C0',
  'white': '#F5F5F5',
  'chocolate': '#4A2C2A',
  'caramel': '#AF6E4D',
  'red': '#B22222',
  'copper': '#D2691E',
  'strawberry': '#E67451',
  'honey': '#D4A76A',
  'ash-blonde': '#B2A388',
  'pink': '#FF69B4',
  'purple': '#9370DB',
  'blue': '#4169E1',
};

const EYE_COLORS = {
  'black': '#1C1C1C',
  'dark-brown': '#3D2817',
  'brown': '#654321',
  'light-brown': '#8B6914',
  'hazel': '#8E7618',
  'amber': '#FFBF00',
  'green': '#5FA777',
  'blue': '#4A90E2',
  'light-blue': '#87CEEB',
  'gray': '#708090',
  'violet': '#8B00FF',
};

// ✅ Body type scale adjustments
const BODY_TYPE_SCALES = {
  // Male body types
  slim: { x: 0.85, y: 1.05, z: 0.85 },
  average: { x: 1.0, y: 1.0, z: 1.0 },
  athletic: { x: 1.08, y: 1.0, z: 1.08 },
  broad: { x: 1.12, y: 0.98, z: 1.12 },
  muscular: { x: 1.18, y: 0.98, z: 1.18 },

  // Female body types
  petite: { x: 0.90, y: 0.95, z: 0.90 },
  curvy: { x: 1.12, y: 0.98, z: 1.15 },
  plus: { x: 1.20, y: 0.96, z: 1.22 },
};

// ✅ Hair visibility/scale settings
const HAIR_STYLES = {
  bald: { visible: false, scale: 0 },
  buzz: { visible: true, scale: 0.2 },
  pixie: { visible: true, scale: 0.3 },
  short: { visible: true, scale: 0.5 },
  crew: { visible: true, scale: 0.4 },
  bob: { visible: true, scale: 0.5 },
  fade: { visible: true, scale: 0.6 },
  lob: { visible: true, scale: 0.6 },
  shoulder: { visible: true, scale: 0.7 },
  pompadour: { visible: true, scale: 0.8 },
  'side-part': { visible: true, scale: 0.7 },
  quiff: { visible: true, scale: 0.8 },
  'slicked-back': { visible: true, scale: 0.7 },
  medium: { visible: true, scale: 0.8 },
  ponytail: { visible: true, scale: 0.8 },
  'high-ponytail': { visible: true, scale: 0.8 },
  bun: { visible: true, scale: 0.6 },
  'messy-bun': { visible: true, scale: 0.7 },
  long: { visible: true, scale: 1.0 },
  'very-long': { visible: true, scale: 1.2 },
  curly: { visible: true, scale: 0.9 },
  'tight-curls': { visible: true, scale: 0.9 },
  wavy: { visible: true, scale: 0.9 },
  straight: { visible: true, scale: 0.9 },
  'man-bun': { visible: true, scale: 0.8 },
  dreadlocks: { visible: true, scale: 1.0 },
  braids: { visible: true, scale: 0.9 },
  'french-braid': { visible: true, scale: 0.8 },
  pigtails: { visible: true, scale: 0.8 },
  'half-up': { visible: true, scale: 0.9 },
};

// ✅ Facial hair opacity/visibility settings
const FACIAL_HAIR_STYLES = {
  none: { visible: false, opacity: 0 },
  stubble: { visible: true, opacity: 0.3 },
  'light-beard': { visible: true, opacity: 0.5 },
  'medium-beard': { visible: true, opacity: 0.7 },
  'full-beard': { visible: true, opacity: 1.0 },
  goatee: { visible: true, opacity: 0.8 },
  mustache: { visible: true, opacity: 0.7 },
  'soul-patch': { visible: true, opacity: 0.6 },
  'van-dyke': { visible: true, opacity: 0.8 },
  'circle-beard': { visible: true, opacity: 0.8 },
};

// ✅ Eyebrow thickness multipliers
const EYEBROW_THICKNESS = {
  thin: 0.6,
  natural: 1.0,
  thick: 1.3,
  arched: 1.1,
  straight: 1.0,
  bushy: 1.5,
  rounded: 1.0,
  's-shaped': 1.1,
};

// ✅ Eyelash length multipliers (female)
const EYELASH_LENGTH = {
  natural: 1.0,
  'light-mascara': 1.2,
  mascara: 1.4,
  dramatic: 1.6,
  'false-lashes': 1.8,
};

// ✅ Lips size multipliers (female)
const LIPS_SIZE = {
  thin: 0.8,
  medium: 1.0,
  full: 1.2,
  plump: 1.4,
};

const RealisticAvatar = ({
  gender = 'male',
  skinTone = 'medium',
  hairColor = null,
  eyeColor = null,
  bodyType = 'average',
  hairstyle = null,
  outfitTexture = null,
  customization = {}
}) => {
  const modelPath = gender === 'female'
    ? '/models/female_avatar.glb'
    : '/models/male_avatar.glb';

  const { scene, materials } = useGLTF(modelPath);
  const sceneRef = useRef();
  const { invalidate, gl } = useThree();
  const materialCacheRef = useRef(new Map());
  const hasProcessedInitialSetup = useRef(false);
  const disposedRef = useRef(false);

  // ✅ Memoize customization values
  const activeCustomization = useMemo(() => {
    return {
      body: customization.body || bodyType || 'average',
      skin: customization.skinTone
        ? customization.skinTone  // use hex directly if it's a hex value
        : customization.skin || skinTone || 'light',
      hair: customization.hair || hairstyle || 'short',
      hairColor: customization.hairColor || hairColor || 'brown',
      eyes: customization.eyes || eyeColor || 'brown',
      eyebrows: customization.eyebrows || 'natural',
      facialHair: customization.facialHair || 'none',
      eyelashes: customization.eyelashes || 'natural',
      lips: customization.lips || 'medium',
      makeup: customization.makeup || 'none',
      accessories: customization.accessories || 'none',
    };
  }, [
    customization.body,
    customization.skin,
    customization.hair,
    customization.hairColor,
    customization.eyes,
    customization.eyebrows,
    customization.facialHair,
    customization.eyelashes,
    customization.lips,
    customization.makeup,
    customization.accessories,
    bodyType,
    skinTone,
    hairstyle,
    hairColor,
    eyeColor,
  ]);

  // ✅ Memoize colors
  const colors = useMemo(() => ({
    skin: activeCustomization.skin?.startsWith('#')
      ? activeCustomization.skin                          // ← use hex directly
      : SKIN_TONE_COLORS[activeCustomization.skin] || SKIN_TONE_COLORS.light,
    hair: HAIR_COLORS[activeCustomization.hairColor] || HAIR_COLORS.brown,
    eyes: EYE_COLORS[activeCustomization.eyes] || EYE_COLORS.brown,
  }), [activeCustomization.skin, activeCustomization.hairColor, activeCustomization.eyes]);

  // ✅ Proper disposal function
  const disposeScene = useCallback(() => {
    if (disposedRef.current || !sceneRef.current) return;

    console.log('🧹 Disposing RealisticAvatar resources...');

    // Dispose all materials from cache
    materialCacheRef.current.forEach((material) => {
      if (material && material.dispose) {
        material.dispose();
      }
    });
    materialCacheRef.current.clear();

    // Dispose scene
    sceneRef.current.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => {
              if (material.dispose) material.dispose();
            });
          } else {
            if (child.material.dispose) child.material.dispose();
          }
        }
      }
    });

    disposedRef.current = true;
    console.log('✅ RealisticAvatar resources disposed');
  }, []);

  // ✅ Clone scene once with proper error handling
  useEffect(() => {
    if (scene && !sceneRef.current && !disposedRef.current) {
      try {
        const clonedScene = scene.clone(true);
        sceneRef.current = clonedScene;
        window.avatarRef = sceneRef;

        console.log(`🎭 RealisticAvatar mounted (Gender: ${gender})`);

        // Notify parent that model is ready
        if (customization.onLoaded) customization.onLoaded();
        else if (window.onAvatarLoaded) window.onAvatarLoaded();

        // Reduced timeout for better performance
        const debugTimeout = setTimeout(() => {
          if (sceneRef.current && !disposedRef.current) {
            debugLogAvatarMeshes(sceneRef);

            // ✅ DEBUG: Log available Morph Targets
            console.log('🔍 Checking for Morph Targets...');
            sceneRef.current.traverse((child) => {
              if (child.isMesh && child.morphTargetDictionary) {
                console.log(`🔍 Mesh "${child.name}" has morphs:`, Object.keys(child.morphTargetDictionary));
              }
            });
          }
        }, 100);

        return () => clearTimeout(debugTimeout);
      } catch (error) {
        console.error('❌ Error cloning avatar scene:', error);
      }
    }
  }, [scene, gender]);

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🎭 RealisticAvatar unmounting...');
      disposeScene();
      window.avatarRef = null;
      hasProcessedInitialSetup.current = false;
    };
  }, [disposeScene]);

  // ✅ Setup initial material properties
  useEffect(() => {
    if (!sceneRef.current || !materials || hasProcessedInitialSetup.current || disposedRef.current) return;

    console.log('🎨 Setting up initial material properties...');

    try {
      Object.values(materials).forEach((material) => {
        if (!material) return;

        material.needsUpdate = true;

        if (material.name.includes('skin') || material.name.includes('body')) {
          material.roughness = 0.6;
          material.metalness = 0;
          material.envMapIntensity = 0.5;
        }
        else if (material.name.includes('hair')) {
          material.roughness = 0.5;
          material.metalness = 0.1;
          material.envMapIntensity = 0.3;
        }
        else if (material.name.includes('shirt') || material.name.includes('pant') || material.name.includes('fabric')) {
          material.roughness = 0.9;
          material.metalness = 0;
          material.envMapIntensity = 0.2;
        }
      });

      sceneRef.current.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.name.includes('Wolf3D_Outfit') || child.name.includes('Outfit')) {
            child.visible = true;
          }
        }
      });

      hasProcessedInitialSetup.current = true;
      console.log('✅ Initial material setup complete');
    } catch (error) {
      console.error('❌ Error setting up materials:', error);
    }
  }, [materials]);

  const getClonedMaterial = useCallback((mesh) => {
    if (!mesh.material || disposedRef.current) return null;

    const cacheKey = `${mesh.uuid}_${mesh.material.uuid}`;

    if (materialCacheRef.current.has(cacheKey)) {
      return materialCacheRef.current.get(cacheKey);
    }

    try {
      const clonedMaterial = mesh.material.clone();
      clonedMaterial.needsUpdate = true;
      materialCacheRef.current.set(cacheKey, clonedMaterial);
      mesh.material = clonedMaterial;
      return clonedMaterial;
    } catch (error) {
      console.error('❌ Error cloning material:', error);
      return null;
    }
  }, []);

  // ✅ Morph Target Mappings (Standard glTF/Wolf3D naming)
  const MORPH_TARGETS = {
    // Male
    muscular: ['Body_Muscle', 'Muscular', 'Strength'],
    slim: ['Body_Thin', 'Slim', 'Underweight'],
    athletic: ['Body_Defined', 'Athletic'],
    heavy: ['Body_Fat', 'Heavy', 'Overweight'],

    // Female
    curvy: ['Body_Curvy', 'Breasts', 'Hips'],
    petite: ['Body_Short', 'Petite'],
    plus: ['Body_Fat', 'Voluptuous'],

    // Generic
    chest: ['Chest', 'Breasts'],
  };

  // ✅ Bone Scaling Configuration (Fallback)
  const BONE_SCALING = {
    slim: {
      Hips: { x: 0.9, y: 1.0, z: 0.9 },
      Spine: { x: 0.9, y: 1.0, z: 0.85 },
      RightUpLeg: { x: 0.9, y: 1.0, z: 0.9 },
      LeftUpLeg: { x: 0.9, y: 1.0, z: 0.9 },
      RightArm: { x: 0.9, y: 1.0, z: 0.9 },
      LeftArm: { x: 0.9, y: 1.0, z: 0.9 },
    },
    average: {
      Hips: { x: 1.0, y: 1.0, z: 1.0 },
      Spine: { x: 1.0, y: 1.0, z: 1.0 },
    },
    athletic: {
      Hips: { x: 0.95, y: 1.0, z: 0.95 },
      Spine: { x: 1.1, y: 1.0, z: 1.15 }, // Broad shoulders
      Spine1: { x: 1.15, y: 1.0, z: 1.15 },
      RightArm: { x: 1.1, y: 1.0, z: 1.1 },
      LeftArm: { x: 1.1, y: 1.0, z: 1.1 },
    },
    broad: {
      Spine: { x: 1.2, y: 1.0, z: 1.1 },
      Spine1: { x: 1.25, y: 1.0, z: 1.15 },
      Spine2: { x: 1.3, y: 1.0, z: 1.2 },
      Shoulders: { x: 1.2, y: 1.0, z: 1.1 },
    },
    muscular: {
      Hips: { x: 1.0, y: 1.0, z: 1.0 },
      Spine: { x: 1.15, y: 1.0, z: 1.2 },
      RightArm: { x: 1.25, y: 1.0, z: 1.25 },
      LeftArm: { x: 1.25, y: 1.0, z: 1.25 },
      RightUpLeg: { x: 1.15, y: 1.0, z: 1.15 },
      LeftUpLeg: { x: 1.15, y: 1.0, z: 1.15 },
    },
    petite: {
      Hips: { x: 0.9, y: 0.95, z: 0.9 }, // Shorter, smaller
      Spine: { x: 0.9, y: 0.95, z: 0.9 },
      RightUpLeg: { x: 0.95, y: 0.95, z: 0.95 },
      LeftUpLeg: { x: 0.95, y: 0.95, z: 0.95 },
    },
    curvy: {
      Hips: { x: 1.2, y: 1.0, z: 1.15 }, // Wider hips
      Spine: { x: 0.95, y: 1.0, z: 1.0 }, // Narrower waist
      RightUpLeg: { x: 1.15, y: 1.0, z: 1.15 }, // Thicker thighs
      LeftUpLeg: { x: 1.15, y: 1.0, z: 1.15 },
    },
    plus: {
      Hips: { x: 1.25, y: 1.0, z: 1.25 },
      Spine: { x: 1.2, y: 1.0, z: 1.2 },
      RightUpLeg: { x: 1.2, y: 1.0, z: 1.2 },
      LeftUpLeg: { x: 1.2, y: 1.0, z: 1.2 },
      RightArm: { x: 1.15, y: 1.0, z: 1.15 },
      LeftArm: { x: 1.15, y: 1.0, z: 1.15 },
    },
  };

  // ✅ Apply body type using Morph Targets (Priority) OR Bone Scaling (Fallback)
  const applyBodyType = useCallback((bodyTypeValue) => {
    if (!sceneRef.current || !bodyTypeValue || disposedRef.current) return;

    console.log(`🏋️ Applying Body Type: ${bodyTypeValue}`);

    let morphsApplied = 0;
    let bonesScaled = 0;

    // 1️⃣ Reset all morph targets and bone scales first
    sceneRef.current.traverse((child) => {
      // Reset Morphs
      if (child.isMesh && child.morphTargetInfluences) {
        for (let i = 0; i < child.morphTargetInfluences.length; i++) {
          child.morphTargetInfluences[i] = 0;
        }
      }
      // Reset Bone Scales (generic names)
      if (child.isBone && (child.name.includes('Spine') || child.name.includes('Hips') || child.name.includes('Arm') || child.name.includes('Leg'))) {
        child.scale.set(1, 1, 1);
      }
    });

    // 2️⃣ Try to use Morph Targets
    // Find keywords for current body type
    const sensitiveWords = MORPH_TARGETS[bodyTypeValue];

    if (sensitiveWords) {
      sceneRef.current.traverse((child) => {
        if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
          // Log available morphs for debugging
          // console.log(`Stats for ${child.name}:`, Object.keys(child.morphTargetDictionary));

          sensitiveWords.forEach(targetName => {
            // Try exact match or partial match
            for (const [key, index] of Object.entries(child.morphTargetDictionary)) {
              if (key.toLowerCase().includes(targetName.toLowerCase())) {
                child.morphTargetInfluences[index] = 1.0;
                morphsApplied++;
                console.log(`   ✅ Enabled Morph: ${key} on ${child.name}`);
              }
            }
          });
        }
      });
    }

    if (morphsApplied > 0) {
      console.log(`✨ Applied ${morphsApplied} morph targets. Skipping bone scaling.`);
      return;
    }

    console.log('⚠️ No matching morph targets found. Falling back to Bone Scaling.');

    // 3️⃣ Fallback to Bone Scaling
    const boneScales = BONE_SCALING[bodyTypeValue];
    if (!boneScales) {
      console.warn(`❌ No bone config for ${bodyTypeValue}`);
      return;
    }
    console.log(`🔧 Attempting Bone Scaling for ${bodyTypeValue}...`);

    // DEBUG: log bone count
    let boneCount = 0;
    sceneRef.current.traverse(c => { if (c.isBone) boneCount++; });
    console.log(`ℹ️ [Debug] Bones in scene: ${boneCount}`);

    sceneRef.current.traverse((child) => {
      // Extended check for bones or bone-like objects (Mixamo)
      if (child.isBone || (child.name.includes('Mixamorig') && child.type === 'Object3D')) {
        let targetScale = null;

        // Exact match
        if (boneScales[child.name]) {
          targetScale = boneScales[child.name];
        }
        // Partial match
        else {
          const key = Object.keys(boneScales).find(k => child.name.includes(k));
          if (key) targetScale = boneScales[key];
        }

        if (targetScale) {
          child.scale.set(targetScale.x, targetScale.y, targetScale.z);
          bonesScaled++;
          console.log(`   ✅ Scaled: ${child.name} to [${targetScale.x}, ${targetScale.y}, ${targetScale.z}]`);
        }
      }
    });

    if (bonesScaled > 0) {
      console.log(`✅ Scaled ${bonesScaled} bones for "${bodyTypeValue}".`);
    } else {
      console.error('❌ Failed to scale any bones. Check logs specific bone names.');
    }

  }, []);

  // ✅ Apply skin tone
  const applySkinTone = useCallback((color) => {
    if (!sceneRef.current || !color || disposedRef.current) return;

    let appliedCount = 0;

    sceneRef.current.traverse((child) => {
      if (child.isMesh && child.material) {
        const childNameLower = child.name.toLowerCase();
        const materialNameLower = child.material.name?.toLowerCase() || '';

        if (
          childNameLower.includes('skin') ||
          childNameLower.includes('body') ||
          childNameLower.includes('face') ||
          childNameLower.includes('head') ||
          childNameLower.includes('arm') ||
          childNameLower.includes('hand') ||
          childNameLower.includes('neck') ||
          childNameLower.includes('leg') ||
          childNameLower.includes('foot') ||
          materialNameLower.includes('skin') ||
          materialNameLower.includes('body') ||
          materialNameLower.includes('face')
        ) {
          const material = getClonedMaterial(child);
          if (material) {
            material.color.set(color);
            material.needsUpdate = true;
            appliedCount++;
          }
        }
      }
    });

    if (appliedCount > 0) {
      console.log(`🎨 Applied skin tone to ${appliedCount} mesh(es)`);
    }
  }, [getClonedMaterial]);

  // ✅ Apply hair color AND hairstyle
  const applyHairCustomization = useCallback((color, hairstyleId) => {
    if (!sceneRef.current || disposedRef.current) return;

    const hairStyle = HAIR_STYLES[hairstyleId] || { visible: true, scale: 1.0 };
    let appliedCount = 0;

    sceneRef.current.traverse((child) => {
      if (child.isMesh && child.material) {
        const childNameLower = child.name.toLowerCase();
        const materialNameLower = child.material.name?.toLowerCase() || '';

        if (
          childNameLower.includes('hair') ||
          materialNameLower.includes('hair')
        ) {
          const material = getClonedMaterial(child);
          if (material && color) {
            material.color.set(color);
            material.needsUpdate = true;
          }

          child.visible = hairStyle.visible;
          if (hairStyle.visible) {
            child.scale.setScalar(hairStyle.scale);
          }

          appliedCount++;
        }
      }
    });

    if (appliedCount > 0) {
      console.log(`💇 Applied hair style "${hairstyleId}" to ${appliedCount} mesh(es)`);
    }
  }, [getClonedMaterial]);

  // ✅ Apply eye color
  const applyEyeColor = useCallback((color) => {
    if (!sceneRef.current || !color || disposedRef.current) return;

    let appliedCount = 0;

    sceneRef.current.traverse((child) => {
      if (child.isMesh && child.material) {
        const childNameLower = child.name.toLowerCase();
        const materialNameLower = child.material.name?.toLowerCase() || '';

        if (
          childNameLower.includes('eye') ||
          childNameLower.includes('iris') ||
          materialNameLower.includes('eye') ||
          materialNameLower.includes('iris')
        ) {
          const material = getClonedMaterial(child);
          if (material) {
            material.color.set(color);
            if (material.emissive) {
              material.emissive.set(color);
              material.emissiveIntensity = 0.2;
            }
            material.needsUpdate = true;
            appliedCount++;
          }
        }
      }
    });

    if (appliedCount > 0) {
      console.log(`👁️ Applied eye color to ${appliedCount} mesh(es)`);
    }
  }, [getClonedMaterial]);

  // ✅ Apply eyebrow thickness
  const applyEyebrowThickness = useCallback((eyebrowType) => {
    if (!sceneRef.current || !eyebrowType || disposedRef.current) return;

    const thickness = EYEBROW_THICKNESS[eyebrowType] || 1.0;
    let appliedCount = 0;

    sceneRef.current.traverse((child) => {
      if (child.isMesh) {
        const childNameLower = child.name.toLowerCase();

        if (childNameLower.includes('eyebrow') || childNameLower.includes('brow')) {
          child.scale.set(1, thickness, 1);
          appliedCount++;
        }
      }
    });

    if (appliedCount > 0) {
      console.log(`🤨 Applied eyebrow thickness "${eyebrowType}" to ${appliedCount} mesh(es)`);
    }
  }, []);

  // ✅ Apply facial hair
  const applyFacialHair = useCallback((facialHairType) => {
    if (!sceneRef.current || !facialHairType || disposedRef.current) return;

    const facialHairStyle = FACIAL_HAIR_STYLES[facialHairType] || { visible: true, opacity: 1.0 };
    let appliedCount = 0;

    sceneRef.current.traverse((child) => {
      if (child.isMesh && child.material) {
        const childNameLower = child.name.toLowerCase();
        const materialNameLower = child.material.name?.toLowerCase() || '';

        if (
          childNameLower.includes('beard') ||
          childNameLower.includes('mustache') ||
          childNameLower.includes('facial') ||
          childNameLower.includes('goatee') ||
          materialNameLower.includes('beard') ||
          materialNameLower.includes('facial')
        ) {
          child.visible = facialHairStyle.visible;

          if (facialHairStyle.visible) {
            const material = getClonedMaterial(child);
            if (material) {
              material.opacity = facialHairStyle.opacity;
              material.transparent = true;
              material.needsUpdate = true;
            }
          }

          appliedCount++;
        }
      }
    });

    if (appliedCount > 0) {
      console.log(`🧔 Applied facial hair "${facialHairType}" to ${appliedCount} mesh(es)`);
    }
  }, [getClonedMaterial]);

  // ✅ Apply eyelash length (female)
  const applyEyelashLength = useCallback((eyelashType) => {
    if (!sceneRef.current || !eyelashType || disposedRef.current) return;

    const length = EYELASH_LENGTH[eyelashType] || 1.0;
    let appliedCount = 0;

    sceneRef.current.traverse((child) => {
      if (child.isMesh) {
        const childNameLower = child.name.toLowerCase();

        if (childNameLower.includes('eyelash') || childNameLower.includes('lash')) {
          child.scale.set(1, length, 1);
          appliedCount++;
        }
      }
    });

    if (appliedCount > 0) {
      console.log(`👁️ Applied eyelash length "${eyelashType}" to ${appliedCount} mesh(es)`);
    }
  }, []);

  // ✅ Apply lips size (female)
  const applyLipsSize = useCallback((lipsType) => {
    if (!sceneRef.current || !lipsType || disposedRef.current) return;

    const size = LIPS_SIZE[lipsType] || 1.0;
    let appliedCount = 0;

    sceneRef.current.traverse((child) => {
      if (child.isMesh) {
        const childNameLower = child.name.toLowerCase();

        if (childNameLower.includes('lip') || childNameLower.includes('mouth')) {
          child.scale.set(1, size, size);
          appliedCount++;
        }
      }
    });

    if (appliedCount > 0) {
      console.log(`💋 Applied lips size "${lipsType}" to ${appliedCount} mesh(es)`);
    }
  }, []);

  // ✅ Main customization effect (OPTIMIZED)
  useEffect(() => {
    if (!sceneRef.current || !hasProcessedInitialSetup.current || disposedRef.current) return;

    console.log('🎨 Applying avatar customizations...');

    try {
      applyBodyType(activeCustomization.body);
      applySkinTone(colors.skin);
      applyHairCustomization(colors.hair, activeCustomization.hair);
      applyEyeColor(colors.eyes);
      applyEyebrowThickness(activeCustomization.eyebrows);
      applyFacialHair(activeCustomization.facialHair);
      applyEyelashLength(activeCustomization.eyelashes);
      applyLipsSize(activeCustomization.lips);

      console.log('✅ All customizations applied');
      invalidate();
    } catch (error) {
      console.error('❌ Error applying customizations:', error);
    }

  }, [
    activeCustomization.body,
    activeCustomization.hair,
    activeCustomization.eyebrows,
    activeCustomization.facialHair,
    activeCustomization.eyelashes,
    activeCustomization.lips,
    colors.skin,
    colors.hair,
    colors.eyes,
    applyBodyType,
    applySkinTone,
    applyHairCustomization,
    applyEyeColor,
    applyEyebrowThickness,
    applyFacialHair,
    applyEyelashLength,
    applyLipsSize,
    invalidate,
  ]);

  // ✅ Handle legacy shirt/pants color
  useEffect(() => {
    if (!sceneRef.current || !hasProcessedInitialSetup.current || disposedRef.current) return;

    if (customization.shirtColor) {
      sceneRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          const childNameLower = child.name.toLowerCase();
          const materialNameLower = child.material.name?.toLowerCase() || '';

          if (
            childNameLower.includes('shirt') ||
            childNameLower.includes('top') ||
            childNameLower.includes('torso') ||
            childNameLower.includes('upper') ||
            materialNameLower.includes('shirt') ||
            materialNameLower.includes('top')
          ) {
            const material = getClonedMaterial(child);
            if (material) {
              material.color.set(customization.shirtColor);
              material.needsUpdate = true;
            }
          }
        }
      });
      invalidate();
    }

    if (customization.pantsColor) {
      sceneRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          const childNameLower = child.name.toLowerCase();
          const materialNameLower = child.material.name?.toLowerCase() || '';

          if (
            childNameLower.includes('pant') ||
            childNameLower.includes('bottom') ||
            childNameLower.includes('lower') ||
            materialNameLower.includes('pant') ||
            materialNameLower.includes('bottom')
          ) {
            const material = getClonedMaterial(child);
            if (material) {
              material.color.set(customization.pantsColor);
              material.needsUpdate = true;
            }
          }
        }
      });
      invalidate();
    }
  }, [customization.shirtColor, customization.pantsColor, getClonedMaterial, invalidate]);

  if (!sceneRef.current || disposedRef.current) {
    return null;
  }

  return (
    <primitive
      object={sceneRef.current}
      scale={1}
      position={[0, 0, 0]}
    />
  );
};

useGLTF.preload('/models/avatar_male.glb');
useGLTF.preload('/models/female_avatar.glb');

export default RealisticAvatar;


