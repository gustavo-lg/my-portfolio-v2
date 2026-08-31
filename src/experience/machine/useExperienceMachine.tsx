import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
} from "react";
import { experienceReducer } from "./reducer";
import type { ExperienceContext, ExperienceEvent } from "./types";

const DEFAULT: ExperienceContext = { state: "intro-forming", target: null };

export function useExperienceMachine(initial: Partial<ExperienceContext> = {}) {
  const [ctx, send] = useReducer(experienceReducer, { ...DEFAULT, ...initial });
  return useMemo(() => ({ ctx, send }), [ctx]);
}

type ExperienceValue = {
  ctx: ExperienceContext;
  send: (e: ExperienceEvent) => void;
};

const Ctx = createContext<ExperienceValue | null>(null);

export function ExperienceProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: Partial<ExperienceContext>;
}) {
  const value = useExperienceMachine(initial);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useExperience(): ExperienceValue {
  const v = useContext(Ctx);
  if (!v)
    throw new Error("useExperience must be used within ExperienceProvider");
  return v;
}
