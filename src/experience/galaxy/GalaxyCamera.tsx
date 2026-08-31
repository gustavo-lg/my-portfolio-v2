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
import { SCENES, type CameraFraming, type SceneKey } from "./categoryScenes";

export interface GalaxyCameraApi {
  flyTo: (
    framing: CameraFraming,
    opts: { duration: number; ease: string; instant?: boolean },
  ) => Promise<void>;
}

const noop: GalaxyCameraApi = { flyTo: () => Promise.resolve() };

const CameraCtx = createContext<React.MutableRefObject<GalaxyCameraApi>>({
  current: noop,
});

export function GalaxyCameraProvider({ children }: { children: ReactNode }) {
  const ref = useRef<GalaxyCameraApi>(noop);
  return <CameraCtx.Provider value={ref}>{children}</CameraCtx.Provider>;
}

export function useGalaxyCamera(): GalaxyCameraApi {
  const ref = useContext(CameraCtx);
  return useMemo(() => ({ flyTo: (f, o) => ref.current.flyTo(f, o) }), [ref]);
}

export function GalaxyCamera({ initial = "menu" }: { initial?: SceneKey }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const apiRef = useContext(CameraCtx);
  const lookAt = useRef(new THREE.Vector3());
  const initialRef = useRef(initial);

  useEffect(() => {
    const apply = (f: CameraFraming) => {
      camera.position.set(...f.position);
      lookAt.current.set(...f.lookAt);
      camera.fov = f.fov;
      camera.updateProjectionMatrix();
      camera.lookAt(lookAt.current);
    };

    apply(SCENES[initialRef.current].framing);

    const flyTo: GalaxyCameraApi["flyTo"] = (f, o) =>
      new Promise<void>((resolve) => {
        if (o.instant || o.duration <= 0) {
          apply(f);
          resolve();
          return;
        }
        const secs = o.duration / 1000;
        const sync = () => {
          camera.updateProjectionMatrix();
          camera.lookAt(lookAt.current);
        };
        gsap.to(camera.position, {
          x: f.position[0],
          y: f.position[1],
          z: f.position[2],
          duration: secs,
          ease: o.ease,
          overwrite: true,
          onUpdate: sync,
        });
        gsap.to(camera, {
          fov: f.fov,
          duration: secs,
          ease: o.ease,
          overwrite: true,
          onUpdate: sync,
        });
        gsap.to(lookAt.current, {
          x: f.lookAt[0],
          y: f.lookAt[1],
          z: f.lookAt[2],
          duration: secs,
          ease: o.ease,
          overwrite: true,
          onUpdate: sync,
          onComplete: () => resolve(),
        });
      });

    apiRef.current = { flyTo };
    return () => {
      apiRef.current = noop;
    };
  }, [camera, apiRef]);

  return null;
}
