export type Vec3 = [number, number, number];

export interface CameraFraming {
  position: Vec3;
  lookAt: Vec3;
}

/** Camera framings used by the experience. */
export const CAMERA_FRAMINGS: {
  center: CameraFraming;
  side: CameraFraming;
} = {
  // Menu / map view — nebula centred, filling the frame.
  center: { position: [0, 0, 9], lookAt: [0, 0, 0] },
  // Internal page — nebula pushed to the right, pulled back as a backdrop.
  side: { position: [-4.5, 0.6, 12], lookAt: [-2.2, 0, 0] },
};

export const FORMATION_MS = 2400;
export const CAMERA_MS = 1200;
