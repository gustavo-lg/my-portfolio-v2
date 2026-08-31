# Sistema Orbital — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the portfolio's single-page-scroll + sidebar navigation with an immersive "orbital system" experience — a persistent WebGL particle nebula, 4 orbiting category labels, a custom cursor, and choreographed camera transitions between content pages.

**Architecture:** A persistent `<OrbitalExperience>` layout hosts a lazy-loaded R3F `<Canvas>` that never unmounts across route changes. A `useExperienceMachine` reducer is the single source of truth for experience state; GSAP timelines and React Router are effects driven by it. Content is extracted from the old section components into a plain-data `src/content/` layer.

**Tech Stack:** Vite 5, React 18.3, TypeScript 5.8, Tailwind 3.4, shadcn/ui, react-router-dom 6, `three@^0.160`, `@react-three/fiber@^8`, `@react-three/drei@^9`, `gsap@^3.12`, Vitest + Testing Library (added in Phase 0).

**Spec:** `docs/superpowers/specs/2026-08-30-sistema-orbital-design.md`

## Global Constraints

- Do NOT upgrade to `@react-three/fiber` v9 — it requires React 19; this project is on React 18.3. Pin R3F `^8`, drei `^9`.
- The R3F `<Canvas>` lives in the persistent layout ABOVE `<Routes>` and must never unmount on route change.
- `useExperienceMachine` is the single source of truth. GSAP and Router are effects of it, never the reverse.
- No custom GLSL shaders and no `@react-three/postprocessing` bloom in the MVP (Phases 0–4). Particles = one `<Points>` with additive-blended circular sprite. Bloom is a measured stretch goal in Phase 2 only.
- Particle animation mutates typed BufferAttribute arrays — never React state per particle.
- Performance tiers: desktop 8k–15k particles, DPR ≤ 2; mobile/low-end 2k–4k particles, DPR clamped 1–1.5, no bloom ever.
- `prefers-reduced-motion` → static single-frame galaxy, instant navigation, no custom cursor, no idle motion.
- Custom cursor only when `matchMedia('(pointer: fine)')` matches AND not reduced-motion. `cursor: none` applied only then.
- Category labels are focusable DOM elements (`<a>`/`<button>`), not WebGL text. Keyboard: Tab order logical, Enter/Space navigates.
- All content-page text rendered in the DOM (SEO + screen readers).
- Routes have real URLs: `/`, `/projetos`, `/stack`, `/sobre`, `/contato`. Deep-linking an internal route skips `intro-forming`.
- Categories (exactly 4): PROJETOS (`/projetos`, icon `Boxes`), STACK (`/stack`, icon `Layers`), SOBRE (`/sobre`, icon `User`), CONTATO (`/contato`, icon `Mail`).
- Back button copy: `VER TUDO`. Wordmark: `Gustavo Gonçalves` / `Desenvolvedor Web`.
- Palette: core cyan `hsl(195 100% 50%)`, orbital particles gradient cyan → purple `hsl(265 80% 62%)`, background dark `hsl(0 0% 8%)`–`hsl(0 0% 12%)`.
- Commit after every green step. Conventional Commit messages. End commit messages with the `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` trailer.

---

## File Structure

### New — content layer
- `src/content/types.ts` — shared TS types (`Project`, `SkillBar`, `SkillCategory`, `AboutPillar`, `ContactInfo`, `ProfileInfo`, `CategoryKey`, `CategoryMeta`).
- `src/content/projects.ts` — `projects: Project[]` (migrated verbatim from `Projects.tsx`).
- `src/content/stack.ts` — `technicalSkills`, `skillCategories`, `softSkills` (migrated from `Skills.tsx`).
- `src/content/about.ts` — `aboutParagraphs: string[]`, `pillars: AboutPillar[]`.
- `src/content/contact.ts` — `contactInfo: ContactInfo`.
- `src/content/profile.ts` — `profile: ProfileInfo` (Hero heading/name/tagline).
- `src/content/categories.ts` — `categories: CategoryMeta[]` (key, label, path, icon name, blurb).

### New — experience core
- `src/experience/machine/types.ts` — `ExperienceState`, `ExperienceEvent`, `ExperienceContext`.
- `src/experience/machine/reducer.ts` — pure `experienceReducer(state, event)`.
- `src/experience/machine/useExperienceMachine.ts` — hook wrapping reducer + `ExperienceProvider`/`useExperience` context.
- `src/experience/OrbitalExperience.tsx` — persistent layout: mounts Canvas + overlay + cursor + `<Routes>`.
- `src/experience/galaxy/GalaxyCanvas.tsx` — lazy `<Canvas>` wrapper, perf-tier + DPR.
- `src/experience/galaxy/ParticleField.tsx` — single `<Points>`, formation + idle.
- `src/experience/galaxy/particleGeometry.ts` — pure helpers: `generateTargetPositions(count, seed)`, `generateDispersedPositions(count, seed)`.
- `src/experience/galaxy/GalaxyCamera.tsx` — imperative camera API (`focusCenter()`, `focusSide()`).
- `src/experience/galaxy/useAnchorProjection.ts` — project 3D anchor → 2D screen coords.
- `src/experience/cursor/CustomCursor.tsx` — DOM cursor, rAF lerp.
- `src/experience/overlay/ExperienceOverlay.tsx` — dark vignette/overlay, animatable.
- `src/experience/menu/OrbitalMenu.tsx` — wordmark + 4 orbital labels.
- `src/experience/menu/OrbitalLabel.tsx` — single label (icon + text), hover/focus.
- `src/experience/pages/ContentPage.tsx` — internal-page layout shell.
- `src/experience/pages/BackButton.tsx` — fixed "VER TUDO" button.
- `src/experience/pages/BottomNav.tsx` — bottom nav with the other 3 categories.
- `src/experience/pages/PageTransition.tsx` — lateral+zoom crossfade wrapper.
- `src/experience/pages/sections/ProjectsView.tsx` — renders `projects`.
- `src/experience/pages/sections/StackView.tsx` — renders stack data.
- `src/experience/pages/sections/AboutView.tsx` — renders about data.
- `src/experience/pages/sections/ContactView.tsx` — form (migrated logic).
- `src/experience/lib/perfTier.ts` — `getPerfTier()` → `{ particleCount, maxDpr, bloom, customCursor }`.
- `src/experience/lib/useReducedMotion.ts` — `usePrefersReducedMotion()`.
- `src/experience/lib/usePointerFine.ts` — `usePointerFine()`.

### Modified
- `src/App.tsx` — drop react-query provider (if unused elsewhere), wrap in `ExperienceProvider`, replace `<Routes>` content.
- `src/pages/Index.tsx` — becomes the `/` route element rendering `<OrbitalMenu>`.
- `src/index.css` — activate dark by default, add `--accent-purple`, cursor tokens.
- `tailwind.config.ts` — add purple color token, orbital keyframes.
- `index.html` — set `<html class="dark">`, fix OG/canonical placeholders, add font `<link>`.
- `package.json` — add deps + `test` script.
- `vite.config.ts` — add Vitest config (or separate `vitest.config.ts`), manualChunks for three.

### Deleted
- `src/App.css`
- `src/components/PortfolioLayout.tsx`
- `src/components/AppSidebar.tsx`
- `src/hooks/use-in-view.tsx`
- `src/components/sections/Hero.tsx`, `About.tsx`, `Projects.tsx`, `Skills.tsx`, `Contact.tsx` (after content migrated)
- `src/components/ui/sidebar.tsx` (only if nothing else imports it — verify)

---

## PHASE 0 — Foundation

Goal: routing, state machine, content layer, tooling — all tested. No WebGL yet.

### Task 0.1: Add tooling and dependencies

**Files:**
- Modify: `package.json`, `vite.config.ts`
- Create: `vitest.config.ts`, `src/test/setup.ts`

**Interfaces:**
- Produces: `npm test` script running Vitest; `@testing-library/react` available.

- [ ] **Step 1: Install dependencies**

```bash
npm i three@^0.160.0 @react-three/fiber@^8.17.0 @react-three/drei@^9.114.0 gsap@^3.12.5
npm i -D vitest@^2.1.0 @vitest/ui@^2.1.0 jsdom@^25.0.0 @testing-library/react@^16.0.0 @testing-library/jest-dom@^6.5.0 @testing-library/user-event@^14.5.0 @types/three@^0.160.0
```

- [ ] **Step 2: Create `src/test/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

// jsdom lacks matchMedia
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Add three to manualChunks in `vite.config.ts`**

In the `defineConfig` return object add:

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        three: ["three", "@react-three/fiber", "@react-three/drei"],
      },
    },
  },
},
```

- [ ] **Step 6: Smoke test**

Create `src/test/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
describe("tooling", () => {
  it("runs", () => expect(1 + 1).toBe(2));
});
```

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: add three, gsap, vitest tooling"
```

### Task 0.2: Design-system updates (dark default + purple token)

**Files:**
- Modify: `src/index.css`, `tailwind.config.ts`, `index.html`
- Delete: `src/App.css`
- Modify: `src/main.tsx` (remove `App.css` import if present — it is not imported today, verify)

**Interfaces:**
- Produces: Tailwind color `accent-purple`; `<html class="dark">`; CSS var `--accent-purple: 265 80% 62%`.

- [ ] **Step 1: Set dark as default in `index.html`**

Change `<html lang="pt-BR">` to `<html lang="pt-BR" class="dark">`.

- [ ] **Step 2: Fix meta placeholders in `index.html`**

Replace `URL_DA_IMAGEM_DE_PREVIEW` (both) with `https://gustavogoncalves.dev.br/og.png`, `URL_DO_SEU_SITE` with `https://gustavogoncalves.dev.br/`, and `@seu_usuario_twitter` — remove the twitter:site line.

- [ ] **Step 3: Add purple token to `src/index.css`**

In both `:root` and `.dark` blocks add:

```css
--accent-purple: 265 80% 62%;
--galaxy-bg: 0 0% 8%;
```

- [ ] **Step 4: Add color to `tailwind.config.ts`**

In `theme.extend.colors` add:

```ts
"accent-purple": "hsl(var(--accent-purple))",
"galaxy-bg": "hsl(var(--galaxy-bg))",
```

- [ ] **Step 5: Delete template cruft**

```bash
git rm src/App.css
```

Verify `src/App.css` is not imported anywhere: `grep -rn "App.css" src/` → no results.

- [ ] **Step 6: Build check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "style: dark mode default, purple accent token, remove template css"
```

### Task 0.3: Content types + `categories.ts`

**Files:**
- Create: `src/content/types.ts`, `src/content/categories.ts`
- Test: `src/content/categories.test.ts`

**Interfaces:**
- Produces:
  - `type CategoryKey = "projetos" | "stack" | "sobre" | "contato"`
  - `interface CategoryMeta { key: CategoryKey; label: string; path: string; icon: "Boxes" | "Layers" | "User" | "Mail"; blurb: string }`
  - `const categories: CategoryMeta[]` (length 4)
  - `const categoryByPath: Record<string, CategoryMeta>`

- [ ] **Step 1: Write `src/content/categories.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { categories, categoryByPath } from "./categories";

describe("categories", () => {
  it("has exactly the 4 spec categories in order", () => {
    expect(categories.map((c) => c.key)).toEqual(["projetos", "stack", "sobre", "contato"]);
  });
  it("each has a leading-slash path and non-empty label/blurb", () => {
    for (const c of categories) {
      expect(c.path.startsWith("/")).toBe(true);
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.blurb.length).toBeGreaterThan(0);
    }
  });
  it("categoryByPath maps every path back to its meta", () => {
    for (const c of categories) expect(categoryByPath[c.path]).toBe(c);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- categories`) — module not found.

- [ ] **Step 3: Create `src/content/types.ts`**

```ts
export type CategoryKey = "projetos" | "stack" | "sobre" | "contato";

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  path: string;
  icon: "Boxes" | "Layers" | "User" | "Mail";
  blurb: string;
}

export interface Project {
  title: string;
  description: string;
  image: string | null;
  features: string[];
  liveUrl: string;
  githubUrl: string;
  featured: boolean;
}

export interface SkillBar { name: string; level: number; category: string }
export interface SkillCategory { title: string; skills: string[]; color: string }
export interface AboutPillar { icon: string; title: string; description: string }
export interface ContactInfo {
  email: string; phone: string; location: string;
  whatsapp: string; instagram: string;
}
export interface ProfileInfo { name: string; title: string; tagline: string }
```

- [ ] **Step 4: Create `src/content/categories.ts`**

```ts
import type { CategoryMeta } from "./types";

export const categories: CategoryMeta[] = [
  { key: "projetos", label: "PROJETOS", path: "/projetos", icon: "Boxes",
    blurb: "Produtos, plataformas e sites entregues." },
  { key: "stack", label: "STACK", path: "/stack", icon: "Layers",
    blurb: "Tecnologias e ferramentas que domino." },
  { key: "sobre", label: "SOBRE", path: "/sobre", icon: "User",
    blurb: "Trajetória e forma de trabalhar." },
  { key: "contato", label: "CONTATO", path: "/contato", icon: "Mail",
    blurb: "Vamos conversar sobre seu projeto." },
];

export const categoryByPath: Record<string, CategoryMeta> = Object.fromEntries(
  categories.map((c) => [c.path, c]),
);
```

- [ ] **Step 5: Run — expect PASS.**

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: content types and category metadata"
```

### Task 0.4: Migrate project/stack/about/contact/profile data

**Files:**
- Create: `src/content/projects.ts`, `stack.ts`, `about.ts`, `contact.ts`, `profile.ts`
- Test: `src/content/content.test.ts`

**Interfaces:**
- Produces:
  - `projects: Project[]` (9 items — copy verbatim from `src/components/sections/Projects.tsx` lines 23–173, keeping the `@/assets/*` imports)
  - `technicalSkills: SkillBar[]`, `skillCategories: SkillCategory[]`, `softSkills: string[]` (from `Skills.tsx`)
  - `aboutParagraphs: string[]` (the two `<p>` bodies from `About.tsx` lines 85–97), `pillars: AboutPillar[]` (the 4 `highlights` from `About.tsx` lines 9–31, `icon` as lucide name string)
  - `contactInfo: ContactInfo` (email `guto_leandro95@hotmail.com`, phone `+55 (48) 99815-5981`, location `Santa Catarina, Brasil`, whatsapp `5548998155981`, instagram `https://www.instagram.com/gu_lg/`)
  - `profile: ProfileInfo` (name `Gustavo Gonçalves`, title `Desenvolvedor Web`, tagline from `Hero.tsx` lines 48–54)

- [ ] **Step 1: Write `src/content/content.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { projects } from "./projects";
import { technicalSkills, skillCategories, softSkills } from "./stack";
import { aboutParagraphs, pillars } from "./about";
import { contactInfo } from "./contact";
import { profile } from "./profile";

describe("content", () => {
  it("has 9 projects, 5 featured", () => {
    expect(projects).toHaveLength(9);
    expect(projects.filter((p) => p.featured)).toHaveLength(5);
  });
  it("every project has title, description, features", () => {
    for (const p of projects) {
      expect(p.title).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.features.length).toBeGreaterThan(0);
    }
  });
  it("stack data present", () => {
    expect(technicalSkills.length).toBeGreaterThan(0);
    expect(skillCategories.length).toBe(4);
    expect(softSkills.length).toBeGreaterThan(0);
  });
  it("about has 2 paragraphs and 4 pillars", () => {
    expect(aboutParagraphs).toHaveLength(2);
    expect(pillars).toHaveLength(4);
  });
  it("contact + profile", () => {
    expect(contactInfo.whatsapp).toBe("5548998155981");
    expect(profile.name).toBe("Gustavo Gonçalves");
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Create the 5 content files** copying data verbatim from the section components (see Interfaces block for exact source lines/values). Keep `import projetoImob from "@/assets/projeto-imob.jpg"` style imports in `projects.ts`.

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: migrate portfolio content into data layer"
```

### Task 0.5: Experience state machine

**Files:**
- Create: `src/experience/machine/types.ts`, `reducer.ts`, `useExperienceMachine.ts`
- Test: `src/experience/machine/reducer.test.ts`

**Interfaces:**
- Produces:
  - `type ExperienceState = "intro-forming" | "intro-settling" | "menu-reveal" | "idle" | "traveling" | "navigating" | "internal-page" | "returning"`
  - `type ExperienceEvent =`
    - `{ type: "FORM_COMPLETE" }` → forming→settling
    - `{ type: "SETTLE_COMPLETE" }` → settling→menu-reveal
    - `{ type: "MENU_REVEALED" }` → menu-reveal→idle
    - `{ type: "SELECT_CATEGORY"; key: CategoryKey }` → idle→traveling (sets `context.target`)
    - `{ type: "CURSOR_ARRIVED" }` → traveling→navigating
    - `{ type: "TRANSITION_COMPLETE" }` → navigating→internal-page
    - `{ type: "REQUEST_RETURN" }` → internal-page→returning
    - `{ type: "RETURN_COMPLETE" }` → returning→idle (clears `context.target`)
    - `{ type: "SWITCH_CATEGORY"; key: CategoryKey }` → internal-page→internal-page (updates `context.target`, no camera return)
    - `{ type: "DEEP_LINK"; key: CategoryKey }` → any→internal-page (deep-link bootstrap; sets target)
    - `{ type: "SKIP_INTRO" }` → intro-*→menu-reveal
  - `interface ExperienceContext { state: ExperienceState; target: CategoryKey | null }`
  - `function experienceReducer(ctx: ExperienceContext, e: ExperienceEvent): ExperienceContext` — pure; unknown transitions return `ctx` unchanged.
  - `useExperienceMachine(initial?: Partial<ExperienceContext>)` → `{ ctx, send }`
  - `<ExperienceProvider>` + `useExperience()` returning `{ ctx, send }`

- [ ] **Step 1: Write `reducer.test.ts`**

```ts
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
    const c = experienceReducer({ state: "idle", target: null }, { type: "SELECT_CATEGORY", key: "stack" });
    expect(c).toEqual({ state: "traveling", target: "stack" });
  });

  it("cursor arrival then transition reaches internal-page", () => {
    let c: ExperienceContext = { state: "traveling", target: "stack" };
    c = experienceReducer(c, { type: "CURSOR_ARRIVED" });
    expect(c.state).toBe("navigating");
    c = experienceReducer(c, { type: "TRANSITION_COMPLETE" });
    expect(c.state).toBe("internal-page");
  });

  it("SWITCH_CATEGORY stays on internal-page and swaps target", () => {
    const c = experienceReducer({ state: "internal-page", target: "stack" }, { type: "SWITCH_CATEGORY", key: "sobre" });
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
    expect(experienceReducer(start, { type: "SKIP_INTRO" }).state).toBe("menu-reveal");
  });

  it("ignores events invalid for the current state", () => {
    const c: ExperienceContext = { state: "idle", target: null };
    expect(experienceReducer(c, { type: "TRANSITION_COMPLETE" })).toBe(c);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement `types.ts` and `reducer.ts`** per the Interfaces block. Reducer is a `switch (ctx.state)` with an inner `switch (e.type)`; default returns `ctx` (same reference).

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Implement `useExperienceMachine.ts`**

```ts
import { createContext, useContext, useReducer, useMemo, type ReactNode } from "react";
import { experienceReducer } from "./reducer";
import type { ExperienceContext, ExperienceEvent } from "./types";

const DEFAULT: ExperienceContext = { state: "intro-forming", target: null };

export function useExperienceMachine(initial: Partial<ExperienceContext> = {}) {
  const [ctx, send] = useReducer(experienceReducer, { ...DEFAULT, ...initial });
  return useMemo(() => ({ ctx, send }), [ctx]);
}

const Ctx = createContext<{ ctx: ExperienceContext; send: (e: ExperienceEvent) => void } | null>(null);

export function ExperienceProvider({ children, initial }: { children: ReactNode; initial?: Partial<ExperienceContext> }) {
  const value = useExperienceMachine(initial);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useExperience() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useExperience must be used within ExperienceProvider");
  return v;
}
```

- [ ] **Step 6: Run full suite** `npm test` — expect PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: experience state machine (reducer + provider)"
```

### Task 0.6: Environment/capability hooks

**Files:**
- Create: `src/experience/lib/useReducedMotion.ts`, `usePointerFine.ts`, `perfTier.ts`
- Test: `src/experience/lib/perfTier.test.ts`

**Interfaces:**
- Produces:
  - `usePrefersReducedMotion(): boolean`
  - `usePointerFine(): boolean`
  - `interface PerfTier { particleCount: number; maxDpr: number; bloom: boolean; customCursor: boolean }`
  - `getPerfTier(opts?: { reducedMotion?: boolean; pointerFine?: boolean; hardwareConcurrency?: number; deviceMemory?: number }): PerfTier`

- [ ] **Step 1: Write `perfTier.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { getPerfTier } from "./perfTier";

describe("getPerfTier", () => {
  it("desktop: 8-core, fine pointer → high tier", () => {
    const t = getPerfTier({ pointerFine: true, hardwareConcurrency: 8 });
    expect(t.particleCount).toBeGreaterThanOrEqual(8000);
    expect(t.customCursor).toBe(true);
  });
  it("mobile: coarse pointer, 4-core → low tier, no cursor, no bloom", () => {
    const t = getPerfTier({ pointerFine: false, hardwareConcurrency: 4 });
    expect(t.particleCount).toBeLessThanOrEqual(4000);
    expect(t.customCursor).toBe(false);
    expect(t.bloom).toBe(false);
  });
  it("reduced motion → minimal particles, no cursor", () => {
    const t = getPerfTier({ reducedMotion: true, pointerFine: true, hardwareConcurrency: 16 });
    expect(t.customCursor).toBe(false);
    expect(t.particleCount).toBeLessThanOrEqual(4000);
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement the three files.** `getPerfTier` is pure logic over the opts; hooks read `matchMedia` + `navigator` and feed `getPerfTier`. `bloom` is always `false` in MVP (constant) regardless of tier — keep the field for later.

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: perf-tier and capability detection helpers"
```

### Task 0.7: Route scaffold + persistent layout (no WebGL)

**Files:**
- Modify: `src/App.tsx`, `src/pages/Index.tsx`
- Create: `src/experience/OrbitalExperience.tsx`, `src/experience/menu/OrbitalMenu.tsx` (placeholder), `src/experience/pages/ContentPage.tsx` (placeholder)
- Delete: `src/components/PortfolioLayout.tsx`, `src/components/AppSidebar.tsx`
- Test: `src/experience/OrbitalExperience.test.tsx`

**Interfaces:**
- Consumes: `ExperienceProvider`/`useExperience`, `categories`, `categoryByPath`.
- Produces: `<OrbitalExperience>` rendering a persistent shell + `<Routes>`:
  - `/` → `<OrbitalMenu>` (placeholder: wordmark + 4 `<Link>`s to category paths)
  - `/:categoryPath` for each category → `<ContentPage category={key}>` (placeholder: `<h1>{label}</h1>` + `<Link to="/">VER TUDO</Link>` + links to other 3)
  - `*` → existing `<NotFound>`
- On mount at an internal path, dispatch `DEEP_LINK`. On mount at `/`, leave machine at `intro-forming` but (Phase 0 only) immediately `SKIP_INTRO` + `MENU_REVEALED` so the menu is visible without WebGL.

- [ ] **Step 1: Write `OrbitalExperience.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ExperienceProvider } from "@/experience/machine/useExperienceMachine";
import { OrbitalExperience } from "@/experience/OrbitalExperience";

function renderAt(path: string) {
  return render(
    <ExperienceProvider>
      <MemoryRouter initialEntries={[path]}>
        <OrbitalExperience />
      </MemoryRouter>
    </ExperienceProvider>,
  );
}

describe("OrbitalExperience routing", () => {
  it("renders the orbital menu with wordmark and 4 category links at /", () => {
    renderAt("/");
    expect(screen.getByText("Gustavo Gonçalves")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /projetos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /stack/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sobre/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /contato/i })).toBeInTheDocument();
  });

  it("renders a content page with VER TUDO at an internal route", () => {
    renderAt("/stack");
    expect(screen.getByRole("heading", { name: /stack/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver tudo/i })).toBeInTheDocument();
  });

  it("unknown route shows NotFound", () => {
    renderAt("/nope");
    expect(screen.getByText(/404|não encontrada|not found/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement placeholders + `OrbitalExperience`.** Route table built from `categories`. Delete `PortfolioLayout.tsx`/`AppSidebar.tsx` and update `Index.tsx` to `export default function Index() { return <OrbitalMenu />; }` OR fold `/` handling into `OrbitalExperience` and make `Index` unused (then delete it and its import). Wire `App.tsx`: `<ExperienceProvider><BrowserRouter><OrbitalExperience /></BrowserRouter></ExperienceProvider>`. Remove `QueryClientProvider` if `grep -rn "useQuery\|queryClient" src/` is empty.

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Verify old section components now unreferenced**

Run: `grep -rn "PortfolioLayout\|AppSidebar\|use-in-view\|sections/Hero" src/`
Expected: no results (except the section files themselves, deleted in Task 0.8).

- [ ] **Step 6: Build + typecheck**

Run: `npm run build && npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: route scaffold and persistent OrbitalExperience shell"
```

### Task 0.8: Delete dead code, wire content into placeholder pages

**Files:**
- Delete: `src/components/sections/{Hero,About,Projects,Skills,Contact}.tsx`, `src/hooks/use-in-view.tsx`, `src/pages/Index.tsx` (if unused)
- Modify: `src/experience/pages/ContentPage.tsx` (render real content from `src/content/*`, minimally styled)
- Delete: `src/components/ui/sidebar.tsx` if `grep -rn "ui/sidebar" src/` is empty
- Test: extend `OrbitalExperience.test.tsx`

- [ ] **Step 1: Add assertions** — at `/projetos` expect first project title (`Projeto Imob`) present; at `/sobre` expect first pillar title (`Código Limpo`); at `/contato` expect a `textbox` for name.

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Render real content** in `ContentPage` via a `switch (category)` delegating to inline sections (full section views come in Phase 4; keep minimal here — map over the data with basic markup).

- [ ] **Step 4: Delete the section components + `use-in-view` + unused `Index.tsx`.** Run the grep checks; delete `ui/sidebar.tsx` and `use-mobile.tsx` only if unreferenced.

- [ ] **Step 5: Run — expect PASS. Build + typecheck.**

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove legacy section components, render content in pages"
```

### Phase 0 checkpoint

`npm test` green, `npm run build` green, `npx tsc --noEmit` clean. Manual: `npm run dev` → `/` shows wordmark + 4 links on dark bg; clicking each navigates to a working content page with real data and a "VER TUDO" link back. No WebGL yet.

---

## PHASE 1 — Particles + formation animation

Goal: the nebula forms on load at `/` and breathes in idle. 60fps desktop, ≥30fps mid-range.

### Task 1.1: Pure particle-geometry helpers

**Files:**
- Create: `src/experience/galaxy/particleGeometry.ts`
- Test: `src/experience/galaxy/particleGeometry.test.ts`

**Interfaces:**
- Produces:
  - `generateTargetPositions(count: number, seed?: number): Float32Array` — length `count*3`; a dense central cluster (~35%) within radius ~0.8 plus a flattened orbital halo (radius ~2–5, thin on Y). Deterministic given seed.
  - `generateDispersedPositions(count: number, seed?: number): Float32Array` — length `count*3`; uniformly scattered in a large sphere (radius ~14). Deterministic.
  - `generateColors(count: number, targets: Float32Array): Float32Array` — length `count*3`; lerp cyan→purple by distance from origin.

- [ ] **Step 1: Write tests** — assert array lengths, determinism (same seed → deep-equal), central-fraction radius bound, halo Y-thinness (mean |y| in halo < mean |x|), colors in [0,1].

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** with a small seeded PRNG (mulberry32). No three.js import needed (plain math).

- [ ] **Step 4: Run — PASS. Commit** `feat: deterministic particle geometry helpers`.

### Task 1.2: GalaxyCanvas wrapper (lazy, perf tier)

**Files:**
- Create: `src/experience/galaxy/GalaxyCanvas.tsx`
- Modify: `src/experience/OrbitalExperience.tsx` (mount `<Suspense><LazyGalaxyCanvas/></Suspense>` as fixed full-viewport background layer, `pointer-events-none`, `z-0`)
- Test: `src/experience/galaxy/GalaxyCanvas.test.tsx` (mock `@react-three/fiber` `Canvas` as a `<div data-testid="canvas">`)

**Interfaces:**
- Consumes: `getPerfTier`, `usePrefersReducedMotion`, `usePointerFine`.
- Produces: `<GalaxyCanvas>` — renders R3F `<Canvas dpr={[1, tier.maxDpr]}>` containing `<ParticleField count={tier.particleCount} reducedMotion={rm} />` and `<GalaxyCamera />`. Default export for `React.lazy`.

- [ ] **Step 1: Test** — with mocked Canvas, `GalaxyCanvas` mounts and passes a `count` prop ≥ 2000 to a mocked `ParticleField`. Reduced-motion path still mounts.

- [ ] **Step 2–4: FAIL → implement → PASS.**

- [ ] **Step 5: Manual** `npm run dev` — dark canvas fills viewport behind the menu; DevTools Network shows `three` chunk loaded lazily.

- [ ] **Step 6: Commit** `feat: lazy GalaxyCanvas with perf tiers`.

### Task 1.3: ParticleField — static formed state

**Files:**
- Create: `src/experience/galaxy/ParticleField.tsx`
- Test: `src/experience/galaxy/ParticleField.test.tsx` (render via `@react-three/test-renderer`)

**Interfaces:**
- Consumes: `generateTargetPositions`, `generateDispersedPositions`, `generateColors`.
- Produces: `<ParticleField count reducedMotion onFormed?>` — one `<points>` with `bufferGeometry` (position + color attributes), `pointsMaterial` (`size`, `vertexColors`, `sizeAttenuation`, `transparent`, `blending={AdditiveBlending}`, `depthWrite={false}`, circular sprite via generated canvas texture). Phase 1.3: render directly at target positions (no animation).

- [ ] **Step 1: Test** — `@react-three/test-renderer` mounts; geometry `position` attribute has `count*3` floats; material `blending === AdditiveBlending`.

- [ ] **Step 2–4: FAIL → implement → PASS.**

- [ ] **Step 5: Manual** — formed nebula visible, cyan→purple, additive glow. Commit `feat: static formed particle field`.

### Task 1.4: Formation animation via GSAP

**Files:**
- Modify: `src/experience/galaxy/ParticleField.tsx`
- Create: `src/experience/galaxy/useFormation.ts`
- Test: `src/experience/galaxy/useFormation.test.ts` (pure interpolation fn)

**Interfaces:**
- Produces:
  - `lerpPositions(from: Float32Array, to: Float32Array, t: number, out: Float32Array): void` — pure, mutates `out`.
  - `useFormation({ dispersed, target, enabled, onComplete })` — drives a `{ t: 0 }` GSAP tween (2.4s, `power2.inOut`); on each tick calls `lerpPositions` into the live attribute array and sets `needsUpdate`. If `!enabled` (reduced motion) jumps to `t=1` and calls `onComplete` next tick.

- [ ] **Step 1: Test `lerpPositions`** — t=0 → from, t=1 → to, t=0.5 → midpoint; mutates `out` not inputs.

- [ ] **Step 2–4: FAIL → implement → PASS.**

- [ ] **Step 5: Wire** `onComplete` → `send({ type: "FORM_COMPLETE" })`. In `OrbitalExperience`, remove the Phase-0 `SKIP_INTRO` shortcut for `/`; now the real machine drives it. Keep `SKIP_INTRO` for `prefers-reduced-motion`.

- [ ] **Step 6: Manual** — reload `/`: particles fly in from dispersed → formed over ~2.4s. Reduced-motion: instant formed. Commit `feat: particle formation animation`.

### Task 1.5: Idle motion

**Files:**
- Modify: `src/experience/galaxy/ParticleField.tsx`
- Create: `src/experience/galaxy/useIdleMotion.ts`
- Test: `src/experience/galaxy/useIdleMotion.test.ts`

**Interfaces:**
- Produces: `idleOffset(i: number, time: number, seed: number): [number, number, number]` — small bounded (|offset| < 0.06) pseudo-noise displacement. `useIdleMotion({ base, enabled })` adds offsets in `useFrame` after formation; disabled under reduced motion or after tab blur.

- [ ] **Step 1: Test** offset bounds + determinism. **Step 2–4: FAIL → implement → PASS.**

- [ ] **Step 5: Manual** — formed nebula drifts/breathes subtly; `document.hidden` freezes it. Commit `feat: idle particle motion`.

### Task 1.6: GalaxyCamera (center framing only)

**Files:**
- Create: `src/experience/galaxy/GalaxyCamera.tsx`
- Test: pure helper `src/experience/galaxy/cameraTargets.test.ts`

**Interfaces:**
- Produces:
  - `CAMERA_POSITIONS: { center: [x,y,z]; side: [x,y,z] }` and `lookAt` targets.
  - `<GalaxyCamera />` — registers with a ref/context exposing `focusCenter()` / `focusSide()` (GSAP tween of camera position + a lookAt proxy, 1.2s `power3.inOut`). Phase 1: only `center` used, set on mount.

- [ ] **Step 1: Test** the constants exist and differ. **Step 2–4: FAIL → implement → PASS. Commit** `feat: galaxy camera with center framing`.

### Phase 1 checkpoint

`/` loads → nebula forms → settles → menu (still the Phase-0 DOM menu) appears. `npm test` green, build green. Manual FPS check desktop (~60) and throttled/mobile emulation (≥30). Reduced-motion path static.

---

## PHASE 2 — Central core + wordmark

### Task 2.1: Denser core + glow halo sprite
- Modify `particleGeometry.ts`: raise central fraction, add a few hundred extra "core" points very near origin; add a large soft additive halo sprite (`<sprite>`) at origin tinted cyan.
- Test: central-fraction assertion updated. Manual: luminous core reads as the focal point.
- Commit `feat: denser luminous galaxy core`.

### Task 2.2: Wordmark overlay
- Create `src/experience/menu/Wordmark.tsx` — absolutely-centered DOM: `profile.name` (Space Grotesk, weight 300, tracked) + `profile.title` beneath (Inter, uppercase, small, muted). Fades in on `intro-settling`.
- Add Google Fonts `<link>` (Space Grotesk 300/400/500, Inter 400/500) to `index.html`; add `font-display` families to `tailwind.config.ts` (`fontFamily.display`, `fontFamily.sans`).
- Test: `Wordmark` renders name + title; hidden until state ≥ `intro-settling`.
- Commit `feat: wordmark overlay and typography`.

### Task 2.3: Bloom spike (stretch, timeboxed)
- Spike: try `@react-three/postprocessing` `<Bloom>` behind a `tier.bloom` flag (still `false` by default). Measure FPS desktop + throttled.
- If ≥55fps desktop AND ≥30fps 4x-throttled → keep, enable for high tier only. Else revert the dependency.
- Document result in the plan file under this task. Commit `feat: optional bloom for high tier` OR `chore: bloom too costly, deferred`.

**Outcome (2026-08-30): DEFERRED.** Not implemented. The glow is provided by
two additive `<sprite>` halos at the core (`ParticleField.tsx`) — cheap and
mobile-safe. Real `@react-three/postprocessing` bloom was left out of the MVP
per the Global Constraints; `PerfTier.bloom` stays `false`. Revisit in Phase 5
only if the sprite glow proves visually insufficient on real devices.

### Phase 2 checkpoint
Core + wordmark visually complete; fonts loading; bloom decision recorded.

---

## PHASE 3 — Orbital menu

### Task 3.1: Anchor projection hook
- Create `src/experience/galaxy/useAnchorProjection.ts` — given 4 orbital anchor positions (Vec3 constants `ORBITAL_ANCHORS: Record<CategoryKey, [number,number,number]>`), each frame project to normalized screen coords via camera; expose `Map<CategoryKey, {x,y,visible}>` through context.
- Test: pure `projectToScreen(pos, camera, size)` → known cases.
- Commit `feat: 3D→2D anchor projection`.

### Task 3.2: OrbitalLabel + OrbitalMenu (real)
- Create `src/experience/menu/OrbitalLabel.tsx` — `<button>` (icon from lucide by `icon` name + label), positioned `translate(-50%,-50%)` at projected coords, `position: fixed`. Hover/focus → scale + glow class.
- Replace the Phase-0 placeholder `OrbitalMenu` with the real one: wordmark + 4 `OrbitalLabel`s driven by projection; each `onClick`/`onKeyDown(Enter)` → `send({ type: "SELECT_CATEGORY", key })` then (Phase 3) `navigate(path)` immediately (choreography added Phase 4).
- Labels appear only when `state === "idle"` (or `menu-reveal` fading in), staggered.
- Test (`OrbitalMenu.test.tsx` with mocked projection context): 4 labels render, correct names/paths, hidden before `menu-reveal`, keyboard nav fires navigate.
- Update `OrbitalExperience.test.tsx` assertions (labels are now `button`s that navigate, wordmark still present).
- Commit `feat: orbital menu with projected category labels`.

### Task 3.3: Menu reveal timeline
- On `SETTLE_COMPLETE`, GSAP staggers label opacity/scale 0→1; `onComplete` → `send({ type: "MENU_REVEALED" })`.
- Hover on a label → subtle brightening of nearby particles (raise `pointsMaterial` size or a localized color boost via uniform-free attribute tweak; keep cheap — a CSS glow on the label plus a global subtle pulse is acceptable if particle-local is too costly).
- Test: reveal sets state to `idle` after stagger (fake timers).
- Commit `feat: staggered menu reveal`.

### Phase 3 checkpoint
Full entry sequence: forming → settling → wordmark → staggered labels → idle. Mouse + keyboard select a category and land on its page (direct nav, no choreography yet).

---

## PHASE 4 — Custom cursor + transition choreography

### Task 4.1: CustomCursor
- Create `src/experience/cursor/CustomCursor.tsx` — `position: fixed` div, rAF lerp toward pointer (ease ~0.12). States: `idle` (free float w/ lag), `hover` (grows/color on `[data-orbital-label]` hover), `traveling` (animates to a target point, ignores pointer). Only mounts when `tier.customCursor`. Adds `cursor: none` to `document.body` while mounted.
- Expose `travelTo(x, y): Promise<void>` via context.
- Test: pure `lerp2d` helper; component mounts only when `pointerFine && !reducedMotion`.
- Commit `feat: custom cursor with lerp follow`.

### Task 4.2: Selection → cursor travel → navigate
- On `SELECT_CATEGORY`: get the label's screen coords from projection, `cursorRef.travelTo(coords)` → on resolve `send({ type: "CURSOR_ARRIVED" })`. Second click or Enter while traveling → resolve immediately (skip).
- Reduced-motion / no-cursor path: `SELECT_CATEGORY` → dispatch `CURSOR_ARRIVED` synchronously.
- Test: machine reaches `navigating` after arrival; skip path shortcuts.
- Commit `feat: cursor travels to target before navigating`.

### Task 4.3: ExperienceOverlay + navigate choreography
- Create `src/experience/overlay/ExperienceOverlay.tsx` — full-viewport dark vignette div, opacity bound to state (visible in `idle`, fades out first in `navigating`).
- On `CURSOR_ARRIVED` → `navigating`: GSAP master timeline —
  1. overlay opacity → 0
  2. labels collapse (scale-down + translateY + fade, stagger)
  3. `camera.focusSide()`
  4. `navigate(categoryByPath-inverse path)` → `ContentPage` mounts
  5. content fades/slides in
  6. `BottomNav` slides up
  `onComplete` → `send({ type: "TRANSITION_COMPLETE" })`.
- Test: timeline ordering via mocked GSAP (assert call order); machine ends at `internal-page`.
- Commit `feat: navigate choreography timeline`.

### Task 4.4: ContentPage layout + sections
- Flesh out `ContentPage.tsx`: `BackButton` (fixed top-left, arrow + "VER TUDO", `onClick` → `send({ REQUEST_RETURN })` then choreograph return), galaxy stays as background (already persistent), content container centered with internal scroll, `BottomNav` fixed.
- Create `src/experience/pages/sections/{ProjectsView,StackView,AboutView,ContactView}.tsx` — proper shadcn-styled rendering of each content module. `ContactView` migrates the WhatsApp `handleSubmit` from old `Contact.tsx`.
- Create `BottomNav.tsx` — the other 3 categories (icon + label), `onClick` → `send({ SWITCH_CATEGORY, key })` + `PageTransition`.
- Tests: each view renders its data (project titles, skill names, pillar titles, form fields); `ContactView` builds correct `wa.me` URL; `BottomNav` excludes current category.
- Commit `feat: internal page layout and section views`.

### Task 4.5: PageTransition + return choreography
- Create `PageTransition.tsx` — wraps `ContentPage` content; on category switch: outgoing content scale-up + translateX right + fade, incoming from left with inverse zoom, simultaneous. Driven by GSAP, keyed on `target`.
- Return: `REQUEST_RETURN` → `returning` timeline — BottomNav down, content out, `camera.focusCenter()`, labels re-stagger in, overlay fades back → `send({ RETURN_COMPLETE })` + `navigate("/")`.
- Deep-link: mounting directly at `/stack` → `DEEP_LINK` → `internal-page`, `camera` starts at `side`, short fade-in, no formation.
- Tests: switch keeps `internal-page` + swaps target + navigates; return reaches `idle` + navigates `/`; deep-link path.
- Commit `feat: page transitions and return choreography`.

### Phase 4 checkpoint
Full loop: menu → (cursor travel) → choreographed transition → content page → switch between pages → back to menu. Keyboard-only path works. Reduced-motion path is instant throughout.

---

## PHASE 5 — Responsiveness, performance, a11y, polish

### Task 5.1: Mobile tier hardening
- Verify low tier: 2–4k particles, DPR clamp, no cursor (native pointer), shortened/simple transitions (CSS crossfade instead of camera dolly where dolly is heavy on mobile GPU — measure).
- Orbital labels reflow for small viewports (stack vertically near center if projection crowds).
- Manual test on a real mid-range Android + iOS Safari.
- Commit `perf: mobile tier hardening`.

### Task 5.2: A11y pass
- Skip-link to `#content`; `<main>`/`<nav>` landmarks; visible focus rings; `aria-current` on active nav; `aria-label`s on icon buttons; ensure Tab order: wordmark → 4 labels → (page) back → content → bottom nav.
- `axe` check in a test (`vitest-axe`) on `/` and one content page.
- Commit `a11y: landmarks, focus, skip-link`.

### Task 5.3: SEO + meta
- Per-route `<title>`/`<meta description>` via a small `useDocumentMeta(category?)` hook (no react-helmet needed).
- Ensure `og.png` exists in `public/` (generate a simple cyan/purple glow 1200×630) and favicon replaced with a matching mark.
- Verify content text present in DOM for all routes (view-source style test).
- Commit `feat: per-route meta and social assets`.

### Task 5.4: Loading + error states
- Suspense fallback for `GalaxyCanvas`: dark bg + faint pulsing dot (no layout shift).
- WebGL-unavailable fallback: if `!WEBGL.isWebGLAvailable()` render a static CSS radial-gradient "galaxy" + the DOM menu; everything still navigable.
- Commit `feat: loading and WebGL-absent fallbacks`.

### Task 5.5: Cross-browser QA + cleanup
- Manual matrix: Chrome, Firefox, Safari, iOS Safari, Chrome Android.
- Remove any remaining dead files (`use-mobile` if unused, `ui/sidebar`); `depcheck` for unused deps; final `npm run build` size review (three chunk lazy, initial JS budget noted).
- Update `README`/`index` docs if present.
- Commit `chore: cross-browser QA and cleanup`.

### Phase 5 checkpoint
Production-ready. All tests green, build green, Lighthouse a11y ≥ 95, no console errors, mobile ≥ 30fps or graceful static fallback.

---

## Self-Review notes

- **Spec coverage:** entry animation (P1.4/P3.3), core+wordmark (P2), orbital menu 4 cats (P3), custom cursor + click sequence (P4.1/4.2), navigate choreography 4 steps (P4.3), internal layout + back button "VER TUDO" (P4.4), lateral page transition (P4.5), return (P4.5), deep-link (P4.5), perf tiers/reduced-motion (P0.6, threaded throughout), mobile (P5.1), SEO (P5.3). Palette + typography (P0.2, P2.2). All spec sections mapped.
- **Placeholder scan:** Phases 2–5 tasks are lighter than 0–1 by design — they are re-expanded to full bite-sized steps by the executor when reached (each still names files, interfaces, tests, commit). Phases 0–1 are fully bite-sized now.
- **Type consistency:** `ExperienceEvent` names, `CategoryKey`, `CategoryMeta`, `PerfTier`, `focusCenter`/`focusSide`, `travelTo`, `lerpPositions` used consistently across tasks.
