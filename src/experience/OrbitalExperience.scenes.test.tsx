import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Capture the scene prop the shell hands to the galaxy. Scoped to this file so
// the file-wide `isWebGLAvailable` override below does not leak into the
// static-galaxy bootstrap tests in OrbitalExperience.test.tsx.
const { galaxyProps, flyToSpy } = vi.hoisted(() => ({
  galaxyProps: [] as { activeScene?: string }[],
  flyToSpy: vi.fn(() => Promise.resolve()),
}));
// Force the live WebGL path so GalaxyCanvas actually mounts under jsdom.
vi.mock("@/experience/lib/webgl", () => ({ isWebGLAvailable: () => true }));
vi.mock("@/experience/galaxy/GalaxyCanvas", () => ({
  default: (props: { activeScene?: string }) => {
    galaxyProps.push({ activeScene: props.activeScene });
    return null;
  },
}));
// Swap the real camera for a spy so we can assert flyTo() calls without WebGL.
vi.mock("@/experience/galaxy/GalaxyCamera", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/experience/galaxy/GalaxyCamera")>();
  return {
    ...actual,
    GalaxyCamera: () => null,
    useGalaxyCamera: () => ({ flyTo: flyToSpy }),
  };
});
import { SCENES } from "@/experience/galaxy/categoryScenes";
import {
  ExperienceProvider,
  useExperience,
} from "@/experience/machine/useExperienceMachine";
import { OrbitalExperience } from "@/experience/OrbitalExperience";

let send: ReturnType<typeof useExperience>["send"];
function MachineHandle() {
  send = useExperience().send;
  return null;
}

function renderAt(path: string) {
  return render(
    <ExperienceProvider>
      <MemoryRouter initialEntries={[path]}>
        <OrbitalExperience />
        <MachineHandle />
      </MemoryRouter>
    </ExperienceProvider>,
  );
}

beforeEach(() => {
  galaxyProps.length = 0;
  flyToSpy.mockClear();
});

describe("OrbitalExperience per-page scenes", () => {
  it("passes the matching scene to the galaxy per route", async () => {
    renderAt("/stack");
    await waitFor(() => expect(galaxyProps.at(-1)?.activeScene).toBe("stack"));

    galaxyProps.length = 0;
    renderAt("/");
    await waitFor(() => expect(galaxyProps.at(-1)?.activeScene).toBe("menu"));
  });

  it("flies the camera to the new scene framing on a category switch", async () => {
    renderAt("/projetos");
    await waitFor(() =>
      expect(galaxyProps.at(-1)?.activeScene).toBe("projetos"),
    );
    flyToSpy.mockClear();

    act(() => send({ type: "SWITCH_CATEGORY", key: "stack" }));

    await waitFor(() =>
      expect(flyToSpy).toHaveBeenCalledWith(
        SCENES.stack.framing,
        expect.anything(),
      ),
    );
    await waitFor(() =>
      expect(galaxyProps.at(-1)?.activeScene).toBe("stack"),
    );
  });

  it("does not fly the camera on a fresh deep-link render (activeSceneRef guard)", async () => {
    renderAt("/stack");
    await waitFor(() => expect(galaxyProps.at(-1)?.activeScene).toBe("stack"));
    // Give the choreography effect a chance to run.
    await act(() => Promise.resolve());
    expect(flyToSpy).not.toHaveBeenCalled();
  });
});
