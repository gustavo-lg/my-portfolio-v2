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
import { framingForAspect, resolveFitForWidth } from "./responsiveFraming";

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
  const size = useThree((s) => s.size);
  const apiRef = useContext(CameraCtx);
  const lookAt = useRef(new THREE.Vector3());
  const initialRef = useRef(initial);
  // Last framing asked for, before any aspect correction. Kept so a resize or
  // an orientation change can be re-fitted without replaying the flight.
  const authoredRef = useRef<CameraFraming>(SCENES[initial].framing);

  const aspect = size.height > 0 ? size.width / size.height : 1;
  const aspectRef = useRef(aspect);
  aspectRef.current = aspect;
  // Live width for the phone check below, kept fresh the same way aspectRef
  // is: written every render, read from imperative closures a one-time
  // effect defines, so it never needs to be an effect dependency.
  const widthRef = useRef(size.width);
  widthRef.current = size.width;

  const resolveFit = (f: CameraFraming): CameraFraming =>
    resolveFitForWidth(f, widthRef.current);

  useEffect(() => {
    const apply = (f: CameraFraming) => {
      const fitted = framingForAspect(resolveFit(f), aspectRef.current);
      camera.position.set(...fitted.position);
      lookAt.current.set(...fitted.lookAt);
      camera.fov = fitted.fov;
      camera.updateProjectionMatrix();
      camera.lookAt(lookAt.current);
    };

    apply(SCENES[initialRef.current].framing);

    const flyTo: GalaxyCameraApi["flyTo"] = (f, o) =>
      new Promise<void>((resolve) => {
        authoredRef.current = f;
        f = framingForAspect(resolveFit(f), aspectRef.current);
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
          onInterrupt: () => resolve(),
        });
      });

    apiRef.current = { flyTo };
    return () => {
      apiRef.current = noop;
    };
  }, [camera, apiRef]);

  // Re-fit when the viewport changes shape. A phone rotated to landscape has
  // room the portrait pull-back no longer needs, and vice versa. Snapped, not
  // animated: a resize is not a camera move the viewer asked for.
  useEffect(() => {
    const fitted = framingForAspect(resolveFit(authoredRef.current), aspect);
    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(camera);
    camera.position.set(...fitted.position);
    lookAt.current.set(...fitted.lookAt);
    camera.fov = fitted.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(lookAt.current);
  }, [aspect, camera]);

  return null;
}
