import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function FloatingOrb({ position, scale, speed, color, distort }) {
  const meshRef = useRef();
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    meshRef.current.position.y = position[1] + Math.sin(t * speed + offset) * 0.3;
    meshRef.current.position.x = position[0] + Math.cos(t * speed * 0.7 + offset) * 0.2;
    meshRef.current.rotation.x = t * 0.1;
    meshRef.current.rotation.z = t * 0.05;
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]} scale={scale} position={position}>
      <MeshDistortMaterial
        color={color}
        attach="material"
        distort={distort}
        speed={1.5}
        roughness={0.1}
        metalness={0.05}
        transparent
        opacity={0.18}
      />
    </Sphere>
  );
}

function FloatingRing({ position, scale, speed }) {
  const meshRef = useRef();
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    meshRef.current.rotation.x = t * 0.2 + offset;
    meshRef.current.rotation.y = t * 0.15;
    meshRef.current.position.y = position[1] + Math.sin(t * speed + offset) * 0.4;
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <torusGeometry args={[1, 0.08, 16, 100]} />
      <meshStandardMaterial color="#6b2737" transparent opacity={0.12} roughness={0.3} />
    </mesh>
  );
}

function Particles() {
  const count = 60;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return arr;
  }, []);

  const pointsRef = useRef();
  useFrame(({ clock }) => {
    pointsRef.current.rotation.y = clock.getElapsedTime() * 0.02;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#c4717e" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

export default function ThreeBackground() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 60 }}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.4} color="#f9e8e0" />
      <pointLight position={[-3, 2, 2]} intensity={0.3} color="#6b2737" />

      <FloatingOrb position={[-3.5, 1, -2]} scale={2.2} speed={0.4} color="#c4717e" distort={0.4} />
      <FloatingOrb position={[3, -1, -3]} scale={1.8} speed={0.3} color="#8b3a4a" distort={0.3} />
      <FloatingOrb position={[0, 2.5, -4]} scale={1.2} speed={0.5} color="#e8b4bb" distort={0.5} />
      <FloatingOrb position={[-1.5, -2.5, -2]} scale={0.9} speed={0.6} color="#6b2737" distort={0.35} />

      <FloatingRing position={[2.5, 1.5, -3]} scale={1.4} speed={0.3} />
      <FloatingRing position={[-2, -1, -4]} scale={1.0} speed={0.4} />

      <Particles />
    </Canvas>
  );
}
