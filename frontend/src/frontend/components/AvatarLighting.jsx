import { Environment, ContactShadows } from '@react-three/drei';

const AvatarLighting = () => {
  return (
    <>
      {/* Ambient light for base illumination */}
      <ambientLight intensity={0.3} />
      
      {/* Main directional light (sun/key light) */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={15}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      
      {/* Fill light from the side */}
      <spotLight
        position={[-3, 5, 3]}
        angle={0.3}
        penumbra={1}
        intensity={0.8}
        castShadow
      />
      
      {/* Rim light from behind */}
      <spotLight
        position={[0, 2, -3]}
        angle={0.5}
        penumbra={1}
        intensity={0.5}
      />
      
      {/* HDR Environment for realistic reflections */}
      <Environment preset="studio" background={false} />
      
      {/* Ground shadows */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.5}
        scale={10}
        blur={2}
        far={4}
      />
    </>
  );
};

export default AvatarLighting;


