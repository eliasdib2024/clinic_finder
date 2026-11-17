// Procedural medical hero: a glossy beating heart inside a slowly turning DNA helix,
// with floating crosses. No external assets — everything is generated in code.
import { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, Lightformer, ContactShadows, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

function heartGeometry() {
  const shape = new THREE.Shape();
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    if (i === 0) shape.moveTo(x * 0.055, y * 0.055); else shape.lineTo(x * 0.055, y * 0.055);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.38, bevelEnabled: true, bevelThickness: 0.42, bevelSize: 0.34, bevelSegments: 14, curveSegments: 80, steps: 1 });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

function Heart({ dark }) {
  const ref = useRef();
  const geo = useMemo(heartGeometry, []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // lub-dub: two quick pulses then rest (~70 bpm)
    const p = (t * 1.15) % 1;
    const beat = Math.exp(-((p - 0.08) ** 2) / 0.002) * 0.07 + Math.exp(-((p - 0.26) ** 2) / 0.003) * 0.045;
    const s = 1 + beat;
    if (ref.current) { ref.current.scale.setScalar(s); ref.current.rotation.y = Math.sin(t * 0.4) * 0.35; }
  });
  return (
    <mesh ref={ref} geometry={geo} castShadow>
      <meshPhysicalMaterial color={dark ? '#3fd0bd' : '#19a896'} roughness={0.18} metalness={0.05} clearcoat={1} clearcoatRoughness={0.12} sheen={0.6} sheenColor="#bff5ec" iridescence={0.25} />
    </mesh>
  );
}

function Helix({ dark }) {
  const group = useRef();
  const { a, b, rungs } = useMemo(() => {
    const a = []; const b = []; const rungs = [];
    const turns = 2.2; const n = 46; const r = 2.25; const h = 4.6;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const ang = f * Math.PI * 2 * turns;
      const y = (f - 0.5) * h;
      const pa = new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r);
      const pb = new THREE.Vector3(Math.cos(ang + Math.PI) * r, y, Math.sin(ang + Math.PI) * r);
      a.push(pa); b.push(pb);
      if (i % 3 === 0) rungs.push([pa, pb]);
    }
    return { a, b, rungs };
  }, []);
  useFrame((_, dt) => { if (group.current) group.current.rotation.y += dt * 0.18; });
  const colA = dark ? '#a6e1d8' : '#0f766e';
  const colB = dark ? '#7cc4f0' : '#3b82c4';
  return (
    <group ref={group} rotation={[0.22, 0, -0.18]}>
      {a.map((p, i) => <mesh key={`a${i}`} position={p}><sphereGeometry args={[0.075, 16, 16]} /><meshStandardMaterial color={colA} roughness={0.3} emissive={colA} emissiveIntensity={dark ? 0.35 : 0.05} /></mesh>)}
      {b.map((p, i) => <mesh key={`b${i}`} position={p}><sphereGeometry args={[0.075, 16, 16]} /><meshStandardMaterial color={colB} roughness={0.3} emissive={colB} emissiveIntensity={dark ? 0.35 : 0.05} /></mesh>)}
      {rungs.map(([p, q], i) => {
        const mid = p.clone().add(q).multiplyScalar(0.5);
        const len = p.distanceTo(q);
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(p).normalize());
        return <mesh key={`r${i}`} position={mid} quaternion={quat}><cylinderGeometry args={[0.012, 0.012, len, 6]} /><meshStandardMaterial color={dark ? '#5fb8ad' : '#a6d9d2'} transparent opacity={0.55} /></mesh>;
      })}
    </group>
  );
}

function Cross({ position, scale = 1, color, speed = 1 }) {
  return (
    <Float speed={speed * 1.6} rotationIntensity={1.2} floatIntensity={1.4}>
      <group position={position} scale={scale}>
        <RoundedBox args={[0.22, 0.7, 0.22]} radius={0.06} smoothness={4}><meshPhysicalMaterial color={color} roughness={0.25} clearcoat={1} /></RoundedBox>
        <RoundedBox args={[0.7, 0.22, 0.22]} radius={0.06} smoothness={4}><meshPhysicalMaterial color={color} roughness={0.25} clearcoat={1} /></RoundedBox>
      </group>
    </Float>
  );
}

function Rig({ children, follow }) {
  const ref = useRef();
  useFrame(({ pointer }) => {
    if (!ref.current || !follow) return;
    ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, pointer.x * 0.35, 0.05);
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, -pointer.y * 0.2, 0.05);
  });
  return <group ref={ref}>{children}</group>;
}

export default function HeroScene({ dark = false, follow = true }) {
  const wrap = useRef(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!wrap.current || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0 }}>
      <Canvas frameloop={visible ? 'always' : 'never'} dpr={[1, 1.75]} camera={{ position: [0, 0.2, 9.2], fov: 38 }} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} shadows aria-hidden>
        <ambientLight intensity={dark ? 0.35 : 0.55} />
        <directionalLight position={[4, 6, 5]} intensity={1.4} castShadow />
        <pointLight position={[-4, -2, 3]} intensity={dark ? 30 : 18} color="#7cc4f0" />
        <pointLight position={[3, 2, -3]} intensity={dark ? 25 : 14} color="#5eead4" />
        <Rig follow={follow}>
          <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.6}><Heart dark={dark} /></Float>
          <Helix dark={dark} />
          <Cross position={[2.6, 1.7, -0.6]} scale={0.8} color={dark ? '#e7fbf8' : '#ffffff'} speed={1} />
          <Cross position={[-2.7, -1.3, 0.4]} scale={0.6} color={dark ? '#7cc4f0' : '#d2f0eb'} speed={1.3} />
          <Cross position={[-2.1, 2.1, -1.4]} scale={0.45} color={dark ? '#a6e1d8' : '#a6d4f2'} speed={0.8} />
        </Rig>
        {!dark && <ContactShadows position={[0, -2.6, 0]} opacity={0.28} scale={9} blur={2.8} far={4} color="#0d5f59" />}
        <Environment resolution={256}>
          <Lightformer intensity={2} position={[0, 4, 4]} scale={[8, 2, 1]} color="#ffffff" />
          <Lightformer intensity={1.2} position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} color="#bdeee6" />
          <Lightformer intensity={1} position={[5, -1, 1]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} color="#cfe6fb" />
        </Environment>
      </Canvas>
    </div>
  );
}
