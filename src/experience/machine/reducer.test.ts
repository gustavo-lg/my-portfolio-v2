import { describe, it, expect } from "vitest";
import { experienceReducer } from "./reducer";
import type { ExperienceContext } from "./types";

const start: ExperienceContext = { state: "intro-forming", target: null };

describe("experienceReducer", () => {
  it("walks the happy path from intro to idle", () => {
    let c = start;
    c = experienceReducer(c, { type: "FORM_COMPLETE" });
    expect(c.state).toBe("intro-settling");
    c = experienceReducer(c, { type: "SETTLE_COMPLETE" });
    expect(c.state).toBe("menu-reveal");
    c = experienceReducer(c, { type: "MENU_REVEALED" });
    expect(c.state).toBe("idle");
  });

  it("SELECT_CATEGORY stores target and enters traveling", () => {
    const c = experienceReducer(
      { state: "idle", target: null },
      { type: "SELECT_CATEGORY", key: "stack" },
    );
    expect(c).toEqual({ state: "traveling", target: "stack" });
  });

  it("SELECT_CATEGORY works during menu-reveal without waiting for MENU_REVEALED", () => {
    const c = experienceReducer(
      { state: "menu-reveal", target: null },
      { type: "SELECT_CATEGORY", key: "projetos" },
    );
    expect(c).toEqual({ state: "traveling", target: "projetos" });
  });

  it("SELECT_CATEGORY works during intro-settling", () => {
    const c = experienceReducer(
      { state: "intro-settling", target: null },
      { type: "SELECT_CATEGORY", key: "sobre" },
    );
    expect(c).toEqual({ state: "traveling", target: "sobre" });
  });

  it("cursor arrival then transition reaches internal-page", () => {
    let c: ExperienceContext = { state: "traveling", target: "stack" };
    c = experienceReducer(c, { type: "CURSOR_ARRIVED" });
    expect(c.state).toBe("navigating");
    c = experienceReducer(c, { type: "TRANSITION_COMPLETE" });
    expect(c.state).toBe("internal-page");
  });

  it("SWITCH_CATEGORY stays on internal-page and swaps target", () => {
    const c = experienceReducer(
      { state: "internal-page", target: "stack" },
      { type: "SWITCH_CATEGORY", key: "sobre" },
    );
    expect(c).toEqual({ state: "internal-page", target: "sobre" });
  });

  it("return path clears target", () => {
    let c: ExperienceContext = { state: "internal-page", target: "sobre" };
    c = experienceReducer(c, { type: "REQUEST_RETURN" });
    expect(c.state).toBe("returning");
    c = experienceReducer(c, { type: "RETURN_COMPLETE" });
    expect(c).toEqual({ state: "idle", target: null });
  });

  it("DEEP_LINK jumps straight to internal-page", () => {
    const c = experienceReducer(start, { type: "DEEP_LINK", key: "projetos" });
    expect(c).toEqual({ state: "internal-page", target: "projetos" });
  });

  it("SKIP_INTRO from forming goes to menu-reveal", () => {
    expect(experienceReducer(start, { type: "SKIP_INTRO" }).state).toBe(
      "menu-reveal",
    );
  });

  it("ignores events invalid for the current state", () => {
    const c: ExperienceContext = { state: "idle", target: null };
    expect(experienceReducer(c, { type: "TRANSITION_COMPLETE" })).toBe(c);
  });
});
