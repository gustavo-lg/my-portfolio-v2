import { Canvas } from "@react-three/fiber";
import { ParticleField } from "./ParticleField";
import { GalaxyCamera } from "./GalaxyCamera";
import {
  AnchorProjector,
  type AnchorScreenPositions,
} from "./useAnchorProjection";
import { useDeviceCapabilities } from "@/experience/lib/useDeviceCapabilities";

interface Props {
  idle: boolean;
  initialFraming?: "center" | "side";
  onFormed?: () => void;
  onAnchors?: (positions: AnchorScreenPositions) => void;
}

/** Full-viewport WebGL backdrop. Default export so it can be React.lazy'd. */
export default function GalaxyCanvas({
  idle,
  initialFraming = "center",
  onFormed,
  onAnchors,
}: Props) {
  const { tier, reducedMotion } = useDeviceCapabilities();

  return (
    <Canvas
      dpr={[1, tier.maxDpr]}
      camera={{ fov: 55, position: [0, 0, 9] }}
      gl={{ antialias: false, alpha: true }}
      style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
    >
      <GalaxyCamera initial={initialFraming} />
      <ParticleField
        count={tier.particleCount}
        reducedMotion={reducedMotion}
        idle={idle}
        onFormed={onFormed}
      />
      {onAnchors && <AnchorProjector onChange={onAnchors} />}
    </Canvas>
  );
}
