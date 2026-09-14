import { describe, it, expect, beforeEach } from "vitest";
import {
  MAX_PROMOTIONS,
  STORAGE_KEY,
  STORAGE_TTL_MS,
  applyMove,
  boundsFor,
  decide,
  loadStored,
  storeIndex,
  type AdaptState,
} from "./adaptiveTier";
import { LADDER, indexOfId } from "./qualityLadder";

// devicePixelRatio 2 gives every rung headroom, so no step is skipped as inert
// and index arithmetic below is direct.
const DPR = 2;

function state(index: number, over: Partial<AdaptState> = {}): AdaptState {
  return { index, demoted: false, promotions: 0, ...over };
}

const rep = (value: number, n = 10) => new Array(n).fill(value);

describe("boundsFor", () => {
  it("scales the bounds to the display", () => {
    expect(boundsFor(60)).toEqual([40, 60]);
    expect(boundsFor(75)).toEqual([40, 60]);
    expect(boundsFor(144)).toEqual([60, 100]);
    expect(boundsFor(165)).toEqual([60, 100]);
  });
});

describe("decide", () => {
  it("maps each band to a move on a 60 Hz display", () => {
    expect(decide(rep(15), 60)).toBe("down2");
    expect(decide(rep(35), 60)).toBe("down1");
    expect(decide(rep(50), 60)).toBe("hold");
    expect(decide(rep(60), 60)).toBe("up1");
  });

  it("judges the same frame rate differently on a high refresh display", () => {
    // 60 fps is comfortable at 60 Hz and merely mid-range at 165 Hz.
    expect(decide(rep(60), 60)).toBe("up1");
    expect(decide(rep(60), 165)).toBe("hold");
    expect(decide(rep(50), 165)).toBe("down1");
    expect(decide(rep(161), 165)).toBe("up1");
  });

  it("ignores a single stall among good samples", () => {
    // This is the case that fooled the old one-average version: two identical
    // measurement runs reported 2631 fps and 322 fps.
    const samples = [...rep(161, 9), 20];
    expect(decide(samples, 165)).toBe("up1");
  });

  it("holds when the samples do not agree", () => {
    const samples = [...rep(161, 6), ...rep(20, 4)];
    expect(decide(samples, 165)).toBe("hold");
  });

  it("needs more than three quarters of the samples to agree", () => {
    expect(decide([...rep(161, 8), ...rep(20, 2)], 165)).toBe("up1");
    expect(decide([...rep(161, 7), ...rep(20, 3)], 165)).toBe("hold");
  });

  it("drops two rungs only when far below the floor", () => {
    expect(decide(rep(19), 60)).toBe("down2");
    expect(decide(rep(21), 60)).toBe("down1");
  });

  it("holds on samples it cannot use", () => {
    expect(decide([], 60)).toBe("hold");
    expect(decide([Number.NaN, 0, -5], 60)).toBe("hold");
    expect(decide(rep(Number.POSITIVE_INFINITY), 60)).toBe("hold");
  });

  it("ignores invalid entries but still judges the valid ones", () => {
    expect(decide([...rep(161, 9), Number.NaN], 165)).toBe("up1");
  });
});

describe("applyMove", () => {
  it("hold changes nothing", () => {
    const s = state(3);
    expect(applyMove(s, "hold", DPR)).toBe(s);
  });

  it("down1 advances one rung and marks the session demoted", () => {
    const next = applyMove(state(0), "down1", DPR);
    expect(next.index).toBe(1);
    expect(next.demoted).toBe(true);
  });

  it("down2 advances two rungs", () => {
    expect(applyMove(state(0), "down2", DPR).index).toBe(2);
  });

  it("down2 stops at the last rung instead of overflowing", () => {
    const last = LADDER.length - 1;
    expect(applyMove(state(last - 1), "down2", DPR).index).toBe(last);
    expect(applyMove(state(last), "down2", DPR).index).toBe(last);
  });

  it("never promotes after a demotion", () => {
    const s = state(3, { demoted: true });
    expect(applyMove(s, "up1", DPR)).toBe(s);
  });

  it("stops promoting at MAX_PROMOTIONS", () => {
    const s = state(3, { promotions: MAX_PROMOTIONS });
    expect(applyMove(s, "up1", DPR)).toBe(s);
  });

  it("cannot promote past the top rung", () => {
    const s = state(0);
    expect(applyMove(s, "up1", DPR)).toBe(s);
  });

  it("promotes one rung and counts it", () => {
    const next = applyMove(state(3), "up1", DPR);
    expect(next.index).toBe(2);
    expect(next.promotions).toBe(1);
    expect(next.demoted).toBe(false);
  });

  it("skips an inert DPR rung when the display has no headroom", () => {
    const next = applyMove(state(indexOfId("ultra")), "down1", 1);
    expect(next.index).toBe(indexOfId("high-"));
  });
});

describe("persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips an index for the same GPU class", () => {
    storeIndex(indexOfId("mid"), "mid");
    expect(loadStored("mid")).toBe(indexOfId("mid"));
  });

  it("ignores an entry written for a different GPU class", () => {
    storeIndex(indexOfId("mid"), "low");
    expect(loadStored("high")).toBeNull();
  });

  it("ignores invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadStored("mid")).toBeNull();
  });

  it("ignores an unknown rung id", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: "nope", gpu: "mid", at: Date.now() }),
    );
    expect(loadStored("mid")).toBeNull();
  });

  it("ignores an entry past the TTL", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        id: "low",
        gpu: "mid",
        at: Date.now() - STORAGE_TTL_MS - 1000,
      }),
    );
    expect(loadStored("mid")).toBeNull();
  });

  it("ignores an entry with no timestamp", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: "low", gpu: "mid" }),
    );
    expect(loadStored("mid")).toBeNull();
  });
});
