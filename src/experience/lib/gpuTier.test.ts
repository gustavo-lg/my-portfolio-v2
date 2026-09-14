import { describe, it, expect } from "vitest";
import { classifyGpu } from "./gpuTier";

describe("classifyGpu", () => {
  it("recognises current dedicated GPUs as high", () => {
    expect(
      classifyGpu(
        "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0)",
      ),
    ).toBe("high");
    expect(
      classifyGpu(
        "ANGLE (AMD, AMD Radeon RX 7800 XT Direct3D11 vs_5_0 ps_5_0)",
      ),
    ).toBe("high");
    expect(classifyGpu("Apple M3 Max")).toBe("high");
  });

  it("recognises older or entry dedicated GPUs as mid", () => {
    expect(
      classifyGpu(
        "ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0)",
      ),
    ).toBe("mid");
    expect(
      classifyGpu(
        "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0)",
      ),
    ).toBe("mid");
    expect(classifyGpu("Apple M1")).toBe("mid");
    expect(classifyGpu("Adreno (TM) 750")).toBe("mid");
  });

  it("recognises weak integrated and software renderers as low", () => {
    expect(
      classifyGpu(
        "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)",
      ),
    ).toBe("low");
    expect(
      classifyGpu("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))"),
    ).toBe("low");
    expect(classifyGpu("Mesa/X.org, llvmpipe (LLVM 15.0.7, 256 bits)")).toBe(
      "low",
    );
  });

  it("treats a missing or empty renderer as unknown, never as fast", () => {
    expect(classifyGpu(null)).toBe("unknown");
    expect(classifyGpu("")).toBe("unknown");
    expect(classifyGpu("Some Unlisted Renderer 9000")).toBe("unknown");
  });

  it("lets low win over a vendor match in the same string", () => {
    expect(classifyGpu("NVIDIA via llvmpipe")).toBe("low");
  });
});
