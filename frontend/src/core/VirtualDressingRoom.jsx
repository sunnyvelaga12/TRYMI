import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Sky } from '@react-three/drei';
import { Box, Text, VStack, Button } from '@chakra-ui/react';
import Avatar from './Avatar';
import LoadingScreen from './LoadingScreen';

// WebGL availability check
const isWebGLAvailable = () => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
};

// Simple 3D loading placeholder
const CanvasLoader = () => {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="green" wireframe />
    </mesh>
  );
};

// Animated Avatar Wrapper with idle animations
const AnimatedAvatar = () => {
  const groupRef = useRef();
  const [animationPhase, setAnimationPhase] = useState(0);

  // Idle animation loop - Snapchat style breathing/bobbing
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      
      // Gentle breathing animation (up and down movement)
      groupRef.current.position.y = Math.sin(time * 0.8) * 0.05;
      
      // Slight rotation/sway
      groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.05;
      
      // Head tilt
      const head = groupRef.current.getObjectByName('Head');
      if (head) {
        head.rotation.z = Math.sin(time * 0.6) * 0.03;
      }
    }
  });

  return (
    <group ref={groupRef}>
      <Avatar />
    </group>
  );
};

const VirtualDressingRoom = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setWebglSupported(false);
      setIsLoading(false);
    }
  }, []);

  // Fallback UI if WebGL is not supported
  if (!webglSupported) {
    return (
      <Box 
        h="100%" 
        w="100%" 
        bg="gray.900" 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
      >
        <VStack spacing={4} p={8} bg="gray.800" borderRadius="md" maxW="500px">
          <Text fontSize="xl" fontWeight="bold" color="yellow.400">
            3D View Unavailable
          </Text>
          <Text color="gray.300" textAlign="center">
            WebGL is not supported or disabled on your browser.
          </Text>
          <Button 
            colorScheme="green" 
            onClick={() => window.location.reload()}
            size="sm"
          >
            Try Again
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box h="100%" w="100%" position="relative">
      {isLoading && <LoadingScreen message="Loading 3D Avatar..." />}

      <Canvas 
        shadows
        gl={{ 
          antialias: true, 
          powerPreference: "high-performance",
          alpha: false,
          stencil: false
        }}
        dpr={[1, 2]}
        onCreated={() => {
          setTimeout(() => setIsLoading(false), 1000);
        }}
      >
        <Suspense fallback={<CanvasLoader />}>
          {/* Camera positioned to show avatar centered and higher */}
          <PerspectiveCamera makeDefault position={[0, 0.5, 2.5]} fov={45} />

          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[5, 5, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <spotLight
            position={[-5, 5, 2]}
            intensity={0.4}
            angle={0.3}
            penumbra={1}
            castShadow
          />

          {/* Environment */}
          <Sky sunPosition={[100, 20, 100]} />
          <Environment preset="city" />

          {/* Ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
            <planeGeometry args={[10, 10]} />
            <shadowMaterial opacity={0.2} />
          </mesh>

          {/* Animated Avatar */}
          <AnimatedAvatar />

          {/* Controls */}
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            minDistance={1.8}
            maxDistance={4}
            maxPolarAngle={Math.PI / 2}
            target={[0, 0.5, 0]}
            enableDamping
            dampingFactor={0.05}
          />
        </Suspense>
      </Canvas>
    </Box>
  );
};

export default VirtualDressingRoom;
