import { Canvas } from "@react-three/fiber";
import { ParticleField } from "./ParticleField";
import { GalaxyCamera } from "./GalaxyCamera";
import { OrbitalLabels } from "@/experience/menu/OrbitalLabels";
import { useDeviceCapabilities } from "@/experience/lib/useDeviceCapabilities";

interface Props {
  idle: boolean;
  menuActive: boolean;
  initialFraming?: "center" | "side";
  onFormed?: () => void;
}

/** Full-viewport WebGL backdrop. Default export so it can be React.lazy'd. */
export default function GalaxyCanvas({
  idle,
  menuActive,
  initialFraming = "center",
  onFormed,
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
      {menuActive && <OrbitalLabels reducedMotion={reducedMotion} />}
    </Canvas>
  );
}
