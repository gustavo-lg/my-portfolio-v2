import type { CategoryKey } from "@/content/types";

export type ExperienceState =
  | "intro-forming"
  | "intro-settling"
  | "menu-reveal"
  | "idle"
  | "traveling"
  | "navigating"
  | "internal-page"
  | "returning";

export type ExperienceEvent =
  | { type: "FORM_COMPLETE" }
  | { type: "SETTLE_COMPLETE" }
  | { type: "MENU_REVEALED" }
  | { type: "SELECT_CATEGORY"; key: CategoryKey }
  | { type: "CURSOR_ARRIVED" }
  | { type: "TRANSITION_COMPLETE" }
  | { type: "REQUEST_RETURN" }
  | { type: "RETURN_COMPLETE" }
  | { type: "SWITCH_CATEGORY"; key: CategoryKey }
  | { type: "DEEP_LINK"; key: CategoryKey }
  | { type: "SKIP_INTRO" };

export interface ExperienceContext {
  state: ExperienceState;
  target: CategoryKey | null;
}
