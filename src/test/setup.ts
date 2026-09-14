import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

// jsdom has no 2D canvas context, which particleTexture.ts needs in order to
// bake the particle sprite. The pixels are never inspected in tests, so a
// no-op context is enough to let the material build.
{
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function patched(
    this: HTMLCanvasElement,
    contextId: string,
    ...rest: unknown[]
  ) {
    if (contextId === "2d") {
      return {
        createRadialGradient: () => ({ addColorStop: () => {} }),
        fillRect: () => {},
        set fillStyle(_v: unknown) {},
        get fillStyle() {
          return "";
        },
      };
    }
    // jsdom has no WebGL either. Returning null is the honest answer and the
    // one the code already handles; letting jsdom reach it only adds a
    // "Not implemented" stack trace to every test run.
    if (contextId === "webgl" || contextId === "experimental-webgl" || contextId === "webgl2") {
      return null;
    }
    return (
      original as (
        this: HTMLCanvasElement,
        id: string,
        ...a: unknown[]
      ) => unknown
    ).call(this, contextId, ...rest);
  } as typeof HTMLCanvasElement.prototype.getContext;
}

// jsdom lacks matchMedia
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
