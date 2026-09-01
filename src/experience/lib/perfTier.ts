export interface PerfTier {
  particleCount: number;
  maxDpr: number;
  bloom: boolean;
  customCursor: boolean;
}

export interface PerfTierOptions {
  reducedMotion?: boolean;
  pointerFine?: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
}

// Counts are the morphing nebula only; GalaxyCanvas adds ~32% more as the
// static surrounding DustField.
const HIGH: Omit<PerfTier, "customCursor"> = {
  particleCount: 60000,
  maxDpr: 1.75,
  bloom: false,
};
const MID: Omit<PerfTier, "customCursor"> = {
  particleCount: 38000,
  maxDpr: 1.6,
  bloom: false,
};
const LOW: Omit<PerfTier, "customCursor"> = {
  particleCount: 12000,
  maxDpr: 1.5,
  bloom: false,
};
const REDUCED: Omit<PerfTier, "customCursor"> = {
  particleCount: 6000,
  maxDpr: 1.5,
  bloom: false,
};

export function getPerfTier(opts: PerfTierOptions = {}): PerfTier {
  const {
    reducedMotion = false,
    pointerFine = false,
    hardwareConcurrency = 4,
    deviceMemory,
  } = opts;

  if (reducedMotion) {
    return { ...REDUCED, customCursor: false };
  }

  const lowMemory = typeof deviceMemory === "number" && deviceMemory <= 4;

  // Coarse pointer or weak CPU/memory -> mobile/low tier.
  if (!pointerFine || hardwareConcurrency <= 4 || lowMemory) {
    return { ...LOW, customCursor: false };
  }

  if (hardwareConcurrency >= 8) {
    return { ...HIGH, customCursor: true };
  }

  return { ...MID, customCursor: true };
}
