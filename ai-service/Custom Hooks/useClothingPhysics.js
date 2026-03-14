import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useClothingStore from '../State Management/clothingStore';

const useClothingPhysics = (meshRef) => {
  const { clothingPhysics } = useClothingStore();
  const velocityRef = useRef(new THREE.Vector3());
  const previousPositionRef = useRef(new THREE.Vector3());

  useEffect(() => {
    if (meshRef.current) {
      previousPositionRef.current.copy(meshRef.current.position);
    }
  }, [meshRef]);

  useFrame((state, delta) => {
    if (!clothingPhysics.enabled || !meshRef.current) return;

    const mesh = meshRef.current;
    
    // Calculate velocity
    const currentPosition = mesh.position.clone();
    velocityRef.current.subVectors(currentPosition, previousPositionRef.current);
    velocityRef.current.divideScalar(delta);

    // Apply damping
    velocityRef.current.multiplyScalar(1 - clothingPhysics.damping);

    // Apply simple cloth physics
    if (mesh.geometry.attributes.position) {
      const positions = mesh.geometry.attributes.position.array;
      const time = state.clock.elapsedTime;

      for (let i = 0; i < positions.length; i += 3) {
        const y = positions[i + 1];
        
        // Apply wave motion for cloth simulation
        const wave = Math.sin(time * 2 + positions[i] * 5) * 0.01;
        positions[i + 1] = y + wave * (1 - clothingPhysics.stiffness);
      }

      mesh.geometry.attributes.position.needsUpdate = true;
    }

    previousPositionRef.current.copy(currentPosition);
  });

  return {
    velocityRef,
  };
};

export default useClothingPhysics;
