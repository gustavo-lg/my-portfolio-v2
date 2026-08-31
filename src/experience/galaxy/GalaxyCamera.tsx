import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { CAMERA_FRAMINGS, CAMERA_MS, type CameraFraming } from "./cameraTargets";

export interface GalaxyCameraApi {
  focusCenter: (opts?: { instant?: boolean }) => Promise<void>;
  focusSide: (opts?: { instant?: boolean }) => Promise<void>;
}

const noop: GalaxyCameraApi = {
  focusCenter: () => Promise.resolve(),
  focusSide: () => Promise.resolve(),
};

const CameraCtx = createContext<React.MutableRefObject<GalaxyCameraApi>>({
  current: noop,
});

/** Provider lives OUTSIDE the Canvas so DOM components can drive the camera. */
export function GalaxyCameraProvider({ children }: { children: ReactNode }) {
  const ref = useRef<GalaxyCameraApi>(noop);
  return <CameraCtx.Provider value={ref}>{children}</CameraCtx.Provider>;
}

export function useGalaxyCamera(): GalaxyCameraApi {
  const ref = useContext(CameraCtx);
  return useMemo(
    () => ({
      focusCenter: (o) => ref.current.focusCenter(o),
      focusSide: (o) => ref.current.focusSide(o),
    }),
    [ref],
  );
}

/** Rendered INSIDE the Canvas. Registers the imperative API on the shared ref. */
export function GalaxyCamera({ initial = "center" }: { initial?: "center" | "side" }) {
  const camera = useThree((s) => s.camera);
  const apiRef = useContext(CameraCtx);
  const lookAt = useRef(new THREE.Vector3(...CAMERA_FRAMINGS[initial].lookAt));

  useEffect(() => {
    const applyInstant = (f: CameraFraming) => {
      camera.position.set(...f.position);
      lookAt.current.set(...f.lookAt);
      camera.lookAt(lookAt.current);
    };

    const animate = (f: CameraFraming, instant?: boolean) =>
      new Promise<void>((resolve) => {
        if (instant) {
          applyInstant(f);
          resolve();
          return;
        }
        gsap.to(camera.position, {
          x: f.position[0],
          y: f.position[1],
          z: f.position[2],
          duration: CAMERA_MS / 1000,
          ease: "power2.inOut",
          onUpdate: () => camera.lookAt(lookAt.current),
        });
        gsap.to(lookAt.current, {
          x: f.lookAt[0],
          y: f.lookAt[1],
          z: f.lookAt[2],
          duration: CAMERA_MS / 1000,
          ease: "power2.inOut",
          onUpdate: () => camera.lookAt(lookAt.current),
          onComplete: () => resolve(),
        });
      });

    applyInstant(CAMERA_FRAMINGS[initial]);

    apiRef.current = {
      focusCenter: (o) => animate(CAMERA_FRAMINGS.center, o?.instant),
      focusSide: (o) => animate(CAMERA_FRAMINGS.side, o?.instant),
    };

    return () => {
      apiRef.current = noop;
    };
  }, [camera, apiRef, initial]);

  return null;
}
