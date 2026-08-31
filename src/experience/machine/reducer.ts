import type { ExperienceContext, ExperienceEvent } from "./types";

/**
 * Pure transition function for the orbital experience.
 * Unknown (state, event) pairs return the same context reference unchanged.
 */
export function experienceReducer(
  ctx: ExperienceContext,
  event: ExperienceEvent,
): ExperienceContext {
  // Events valid from (almost) any state.
  switch (event.type) {
    case "DEEP_LINK":
      return { state: "internal-page", target: event.key };
    case "SKIP_INTRO":
      if (
        ctx.state === "intro-forming" ||
        ctx.state === "intro-settling" ||
        ctx.state === "menu-reveal"
      ) {
        return { ...ctx, state: "menu-reveal" };
      }
      return ctx;
  }

  switch (ctx.state) {
    case "intro-forming":
      if (event.type === "FORM_COMPLETE")
        return { ...ctx, state: "intro-settling" };
      return ctx;

    case "intro-settling":
      if (event.type === "SETTLE_COMPLETE")
        return { ...ctx, state: "menu-reveal" };
      return ctx;

    case "menu-reveal":
      if (event.type === "MENU_REVEALED") return { ...ctx, state: "idle" };
      return ctx;

    case "idle":
      if (event.type === "SELECT_CATEGORY")
        return { state: "traveling", target: event.key };
      return ctx;

    case "traveling":
      if (event.type === "CURSOR_ARRIVED")
        return { ...ctx, state: "navigating" };
      if (event.type === "SELECT_CATEGORY")
        return { ...ctx, target: event.key };
      return ctx;

    case "navigating":
      if (event.type === "TRANSITION_COMPLETE")
        return { ...ctx, state: "internal-page" };
      return ctx;

    case "internal-page":
      if (event.type === "SWITCH_CATEGORY")
        return { ...ctx, target: event.key };
      if (event.type === "REQUEST_RETURN")
        return { ...ctx, state: "returning" };
      return ctx;

    case "returning":
      if (event.type === "RETURN_COMPLETE")
        return { state: "idle", target: null };
      return ctx;

    default:
      return ctx;
  }
}
