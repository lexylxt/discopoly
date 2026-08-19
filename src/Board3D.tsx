import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { groupColors, spaces, tileGrid, tileWorld } from "./board";
import type { GameState, Player } from "./game";

function BoardBase() {
  return (
    <>
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[18.8, 0.45, 18.8]} />
        <meshStandardMaterial color="#cfe5c8" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.23, 0]}>
        <boxGeometry args={[17.1, 0.07, 17.1]} />
        <meshStandardMaterial color="#d9ead4" roughness={0.9} />
      </mesh>
    </>
  );
}

function imageFor(space: (typeof spaces)[number]) {
  return space.icon ?? null;
}

function TileIcon({ url, rotation }: { url: string; rotation: number }) {
  const texture = useLoader(THREE.TextureLoader, url);
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh
      position={[0, 0.31, 0]}
      rotation={[-Math.PI / 2, 0, rotation]}
    >
      <planeGeometry args={[0.8, 0.8]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

function Tile({ index }: { index: number }) {
  const space = spaces[index];
  const [gx, gz] = tileGrid(index);
  const [x, , z] = tileWorld(index);

  const isCorner = [0, 10, 20, 30].includes(index);
  const vertical = gx === 0 || gx === 10;
  const sizeX = isCorner ? 1.65 : vertical ? 1.65 : 1.65;
  const sizeZ = isCorner ? 1.65 : vertical ? 1.65 : 1.65;

  let rotation = 0;
  if (gz === 10) rotation = Math.PI;
  else if (gx === 0) rotation = -Math.PI / 2;
  else if (gz === 0) rotation = 0;
  else if (gx === 10) rotation = Math.PI / 2;

  const stripColor = space.group ? groupColors[space.group] : null;
  const icon = imageFor(space);

  return (
    <group position={[x, 0.3, z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[sizeX - 0.04, 0.14, sizeZ - 0.04]} />
        <meshStandardMaterial color={isCorner ? "#f5efe2" : "#f7f7ef"} roughness={0.72} />
      </mesh>

      {stripColor && (
        <mesh
          position={[
            Math.sin(rotation) * -0.57,
            0.09,
            Math.cos(rotation) * -0.57
          ]}
          rotation={[0, -rotation, 0]}
        >
          <boxGeometry args={[1.5, 0.06, 0.30]} />
          <meshStandardMaterial color={stripColor} />
        </mesh>
      )}

      {icon && <TileIcon url={icon} rotation={rotation} />}

      {!icon && (
        <Text
          position={[0, 0.17, 0]}
          rotation={[-Math.PI / 2, 0, rotation]}
          fontSize={isCorner ? 0.20 : 0.16}
          maxWidth={1.15}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          color="#171717"
        >
          {space.name}
        </Text>
      )}

      {space.price && (
        <Text
          position={[
            Math.sin(rotation) * 0.53,
            0.17,
            Math.cos(rotation) * 0.53
          ]}
          rotation={[-Math.PI / 2, 0, rotation]}
          fontSize={0.14}
          color="#2f2f2f"
          anchorX="center"
        >
          {space.price}
        </Text>
      )}
    </group>
  );
}

function CenterLogo() {
  return (
    <group position={[0, 0.32, 0]} rotation={[0, -0.62, 0]}>
      <Text
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.25}
        color="#202127"
        anchorX="center"
        anchorY="middle"
      >
        DISCOPOLY
      </Text>
      <Text
        position={[0, 0.01, 1.05]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.25}
        color="#5865f2"
      >
        THE DISCORD BOARD GAME
      </Text>
    </group>
  );
}

function PawnGeometry({ kind, active }: { kind: Player["token"]; active: boolean }) {
  const color =
    kind === "bot" ? "#ed4245" :
    kind === "duck" ? "#f0d34b" :
    kind === "car" ? "#57f287" :
    "#5865f2";

  if (kind === "bot") {
    return (
      <group>
        <mesh castShadow position={[0, 0.34, 0]}>
          <boxGeometry args={[0.46, 0.50, 0.42]} />
          <meshStandardMaterial color={color} metalness={0.25} roughness={0.4} />
        </mesh>
        <mesh castShadow position={[-0.13, 0.67, 0]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive={active ? color : "#000000"} emissiveIntensity={0.3} />
        </mesh>
        <mesh castShadow position={[0.13, 0.67, 0]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive={active ? color : "#000000"} emissiveIntensity={0.3} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh castShadow position={[0, 0.20, 0]}>
        <cylinderGeometry args={[0.28, 0.34, 0.16, 24]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} />
      </mesh>
      <mesh castShadow position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.13, 0.22, 0.38, 24]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} />
      </mesh>
      <mesh castShadow position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} emissive={active ? color : "#000000"} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

function PlayerToken({ player, slot, active }: { player: Player; slot: number; active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const target = useMemo(() => {
    const [x, y, z] = tileWorld(player.position);
    const offsets = [
      [-0.32, 0, -0.32],
      [0.32, 0, 0.32],
      [-0.32, 0, 0.32],
      [0.32, 0, -0.32]
    ];
    const o = offsets[slot % offsets.length];
    return new THREE.Vector3(x + o[0], y + 0.17, z + o[2]);
  }, [player.position, slot]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.position.lerp(target, 1 - Math.pow(0.001, delta));
    ref.current.rotation.y += active ? delta * 0.55 : 0;
  });

  return (
    <group ref={ref} position={target}>
      <PawnGeometry kind={player.token} active={active} />
    </group>
  );
}

function Die({ value, x }: { value: number; x: number }) {
  return (
    <group position={[x, 0.65, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.72, 0.72, 0.72]} />
        <meshStandardMaterial color="#fbfbfb" roughness={0.35} />
      </mesh>
      <Text position={[0, 0, 0.365]} fontSize={0.33} color="#111">{value}</Text>
    </group>
  );
}

function Scene({ state }: { state: GameState }) {
  return (
    <>
      <color attach="background" args={["#17191f"]} />
      <fog attach="fog" args={["#17191f", 24, 45]} />

      <ambientLight intensity={1.3} />
      <directionalLight
        castShadow
        intensity={2.1}
        position={[10, 17, 10]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <group rotation={[0, -0.15, 0]}>
        <BoardBase />
        {spaces.map(space => <Tile key={space.index} index={space.index} />)}
        <CenterLogo />

        {state.players.map((p, i) => (
          <PlayerToken key={p.id} player={p} slot={i} active={state.turn === i} />
        ))}

        <Die value={state.dice[0]} x={-0.55} />
        <Die value={state.dice[1]} x={0.55} />
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial color="#101116" roughness={1} />
      </mesh>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={14}
        maxDistance={31}
        minPolarAngle={0.45}
        maxPolarAngle={1.25}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function Board3D({ state }: { state: GameState }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{ position: [14, 18, 18], fov: 42, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <Scene state={state} />
    </Canvas>
  );
}
