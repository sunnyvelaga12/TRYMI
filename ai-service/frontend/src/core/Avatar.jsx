import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import useAvatarStore from '../State Management/avatarStore';

const Avatar = () => {
  const groupRef = useRef();
  const headRef = useRef();
  const bodyRef = useRef();
  
  const { avatar } = useAvatarStore();

  // Create realistic materials for Snapchat-style avatar
  const skinMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: avatar.skinTone || '#e6c3a0',
      roughness: 0.6,
      metalness: 0.1,
      transparent: false,
    });
  }, [avatar.skinTone]);

  const hairMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#2b2b2b',
      roughness: 0.8,
      metalness: 0.0,
    });
  }, []);

  const clothingMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.7,
      metalness: 0.0,
    });
  }, []);

  const pantsMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#4a7ba7',
      roughness: 0.8,
      metalness: 0.0,
    });
  }, []);

  const shoesMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#e8e8e8',
      roughness: 0.4,
      metalness: 0.1,
    });
  }, []);

  // Idle animation
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    if (groupRef.current) {
      // Gentle breathing
      groupRef.current.position.y = Math.sin(time * 1.2) * 0.03;
    }
    
    if (headRef.current) {
      // Head movement
      headRef.current.rotation.y = Math.sin(time * 0.7) * 0.08;
      headRef.current.rotation.z = Math.sin(time * 0.5) * 0.03;
    }
  });

  return (
    <group 
      ref={groupRef} 
      scale={[avatar.height || 1, avatar.height || 1, avatar.height || 1]}
      position={[0, -0.5, 0]}
    >
      {/* Head - Snapchat Bitmoji proportions (larger head) */}
      <group ref={headRef} position={[0, 1.4, 0]}>
        {/* Face */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.35, 32, 32]} />
          <primitive object={skinMaterial} attach="material" />
        </mesh>

        {/* Eyes */}
        <group position={[0, 0.05, 0.3]}>
          {/* Left Eye */}
          <group position={[-0.12, 0, 0]}>
            {/* Eye White */}
            <mesh castShadow>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            {/* Pupil */}
            <mesh position={[0, 0, 0.05]} castShadow>
              <sphereGeometry args={[0.04, 16, 16]} />
              <meshStandardMaterial color="#2d2d2d" />
            </mesh>
          </group>

          {/* Right Eye */}
          <group position={[0.12, 0, 0]}>
            {/* Eye White */}
            <mesh castShadow>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            {/* Pupil */}
            <mesh position={[0, 0, 0.05]} castShadow>
              <sphereGeometry args={[0.04, 16, 16]} />
              <meshStandardMaterial color="#2d2d2d" />
            </mesh>
          </group>
        </group>

        {/* Eyebrows */}
        <group position={[0, 0.15, 0.28]}>
          {/* Left Eyebrow */}
          <mesh position={[-0.12, 0, 0]} rotation={[0, 0, 0.1]} castShadow>
            <boxGeometry args={[0.15, 0.03, 0.02]} />
            <meshStandardMaterial color="#2b2b2b" />
          </mesh>
          {/* Right Eyebrow */}
          <mesh position={[0.12, 0, 0]} rotation={[0, 0, -0.1]} castShadow>
            <boxGeometry args={[0.15, 0.03, 0.02]} />
            <meshStandardMaterial color="#2b2b2b" />
          </mesh>
        </group>

        {/* Nose */}
        <mesh position={[0, -0.05, 0.32]} castShadow>
          <coneGeometry args={[0.04, 0.1, 8]} />
          <primitive object={skinMaterial} attach="material" />
        </mesh>

        {/* Mouth - Snapchat smile */}
        <mesh position={[0, -0.15, 0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.12, 0.02, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>

        {/* Hair - Snapchat style */}
        <mesh position={[0, 0.25, -0.05]} castShadow>
          <sphereGeometry args={[0.38, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          <primitive object={hairMaterial} attach="material" />
        </mesh>

        {/* Sunglasses (optional) */}
        <group position={[0, 0.05, 0.32]}>
          <mesh position={[-0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.18, 0.12, 0.02]} />
            <meshStandardMaterial 
              color="#000000" 
              transparent 
              opacity={0.8} 
              roughness={0.1}
              metalness={0.8}
            />
          </mesh>
          <mesh position={[0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.18, 0.12, 0.02]} />
            <meshStandardMaterial 
              color="#000000" 
              transparent 
              opacity={0.8}
              roughness={0.1}
              metalness={0.8}
            />
          </mesh>
          {/* Bridge */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.08, 0.02, 0.02]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
        </group>
      </group>

      {/* Neck */}
      <mesh position={[0, 1.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.2, 16]} />
        <primitive object={skinMaterial} attach="material" />
      </mesh>

      {/* Body - Snapchat proportions */}
      <group ref={bodyRef}>
        {/* Torso */}
        <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.7, 0.35]} />
          <primitive object={clothingMaterial} attach="material" />
        </mesh>

        {/* Collar */}
        <mesh position={[0, 1.05, 0.1]} castShadow>
          <boxGeometry args={[0.5, 0.08, 0.02]} />
          <primitive object={clothingMaterial} attach="material" />
        </mesh>

        {/* Arms */}
        <group>
          {/* Left Arm */}
          <group position={[-0.35, 0.85, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.08, 0.08, 0.5, 16]} />
              <primitive object={clothingMaterial} attach="material" />
            </mesh>
            {/* Left Hand */}
            <mesh position={[0, -0.35, 0]} castShadow>
              <sphereGeometry args={[0.1, 16, 16]} />
              <primitive object={skinMaterial} attach="material" />
            </mesh>
          </group>

          {/* Right Arm */}
          <group position={[0.35, 0.85, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.08, 0.08, 0.5, 16]} />
              <primitive object={clothingMaterial} attach="material" />
            </mesh>
            {/* Right Hand */}
            <mesh position={[0, -0.35, 0]} castShadow>
              <sphereGeometry args={[0.1, 16, 16]} />
              <primitive object={skinMaterial} attach="material" />
            </mesh>
          </group>
        </group>

        {/* Legs */}
        <group position={[0, 0.25, 0]}>
          {/* Left Leg */}
          <group position={[-0.15, 0, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.12, 0.11, 0.7, 16]} />
              <primitive object={pantsMaterial} attach="material" />
            </mesh>
            {/* Left Shoe */}
            <mesh position={[0, -0.45, 0.05]} castShadow>
              <boxGeometry args={[0.15, 0.1, 0.25]} />
              <primitive object={shoesMaterial} attach="material" />
            </mesh>
          </group>

          {/* Right Leg */}
          <group position={[0.15, 0, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.12, 0.11, 0.7, 16]} />
              <primitive object={pantsMaterial} attach="material" />
            </mesh>
            {/* Right Shoe */}
            <mesh position={[0, -0.45, 0.05]} castShadow>
              <boxGeometry args={[0.15, 0.1, 0.25]} />
              <primitive object={shoesMaterial} attach="material" />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};

export default Avatar;


