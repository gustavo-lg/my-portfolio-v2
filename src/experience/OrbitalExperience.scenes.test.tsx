import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Capture the scene prop the shell hands to the galaxy. Scoped to this file so
// the file-wide `isWebGLAvailable` override below does not leak into the
// static-galaxy bootstrap tests in OrbitalExperience.test.tsx.
const { galaxyProps } = vi.hoisted(() => ({
  galaxyProps: [] as { activeScene?: string }[],
}));
// Force the live WebGL path so GalaxyCanvas actually mounts under jsdom.
vi.mock("@/experience/lib/webgl", () => ({ isWebGLAvailable: () => true }));
vi.mock("@/experience/galaxy/GalaxyCanvas", () => ({
  default: (props: { activeScene?: string }) => {
    galaxyProps.push({ activeScene: props.activeScene });
    return null;
  },
}));
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

describe("OrbitalExperience per-page scenes", () => {
  it("passes the matching scene to the galaxy per route", async () => {
    galaxyProps.length = 0;
    renderAt("/stack");
    await waitFor(() => expect(galaxyProps.at(-1)?.activeScene).toBe("stack"));

    galaxyProps.length = 0;
    renderAt("/");
    await waitFor(() => expect(galaxyProps.at(-1)?.activeScene).toBe("menu"));
  });
});
