import * as THREE from 'three';

export const threeConfig = {
  // Renderer settings
  renderer: {
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    shadowMap: {
      enabled: true,
      type: THREE.PCFSoftShadowMap,
    },
  },

  // Camera settings
  camera: {
    fov: 50,
    near: 0.1,
    far: 1000,
    position: [0, 1, 3],
  },

  // Lighting presets
  lighting: {
    ambient: {
      color: 0xffffff,
      intensity: 0.5,
    },
    directional: {
      color: 0xffffff,
      intensity: 1,
      position: [5, 5, 5],
      castShadow: true,
      shadowMapSize: [2048, 2048],
    },
    spot: {
      color: 0xffffff,
      intensity: 0.5,
      position: [-5, 5, 2],
      angle: 0.3,
      penumbra: 1,
      castShadow: true,
    },
  },

  // Avatar settings
  avatar: {
    scale: 1.0,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
  },

  // Clothing physics
  clothPhysics: {
    gravity: -9.81,
    stiffness: 0.8,
    damping: 0.3,
    mass: 0.1,
  },

  // Performance settings
  performance: {
    maxPixelRatio: 2,
    lodDistance: [0, 50, 100],
    useLOD: true,
    frustumCulling: true,
  },
};

export const materialPresets = {
  fabric: {
    cotton: {
      roughness: 0.7,
      metalness: 0.0,
      transmission: 0.0,
    },
    silk: {
      roughness: 0.3,
      metalness: 0.1,
      transmission: 0.1,
    },
    leather: {
      roughness: 0.6,
      metalness: 0.2,
      transmission: 0.0,
    },
    denim: {
      roughness: 0.8,
      metalness: 0.0,
      transmission: 0.0,
    },
  },
};

export default threeConfig;
