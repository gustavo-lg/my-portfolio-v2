import { useEffect, useState } from "react";
import { PERF_DEBUG, perfStats, type PerfStats } from "./perfDebug";

const POLL_MS = 500;

const STYLE: React.CSSProperties = {
  position: "fixed",
  top: 8,
  left: 8,
  zIndex: 9999,
  padding: "6px 9px",
  borderRadius: 6,
  background: "rgba(0, 0, 0, 0.72)",
  color: "#d8e7ff",
  font: "11px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  whiteSpace: "pre",
  pointerEvents: "none",
  userSelect: "none",
};

/**
 * On-screen performance readout, shown only when PERF_DEBUG is on.
 *
 * Exists because the machines that most need measuring are reached through a
 * deploy: a weak desktop somewhere else, or a phone. Copying console output off
 * those is awkward or impossible, and a number you can photograph is worth more
 * than one you cannot reach.
 */
export function PerfHud() {
  const [s, setS] = useState<PerfStats>({ ...perfStats });

  useEffect(() => {
    if (!PERF_DEBUG) return;
    const id = setInterval(() => setS({ ...perfStats }), POLL_MS);
    return () => clearInterval(id);
  }, []);

  if (!PERF_DEBUG) return null;

  const probe =
    s.probeFps === null
      ? `probe    pending`
      : `probe    ${s.probeFps.toFixed(1)} fps (round ${s.probeRounds})`;

  return (
    <div style={STYLE} aria-hidden data-perf-hud>
      {[
        `rung     ${s.rung}`,
        `fps      ${s.fps.toFixed(1)}`,
        `cpu/f    ${s.bodyMs.toFixed(2)} ms`,
        `points   ${s.particles.toLocaleString("en-US")} +${s.detail.toLocaleString("en-US")}`,
        `dpr      ${s.dpr.toFixed(2)} / ${s.devicePixelRatio}`,
        probe,
      ].join("\n")}
      {s.shaderError ? `\nSHADER   ${s.shaderError}` : ""}
    </div>
  );
}
