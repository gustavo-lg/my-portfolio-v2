import gsap from "gsap";

/**
 * Smoothly animate the window scroll position up to the top and resolve once
 * it lands. Used before every page-to-page navigation so the reader is taken
 * back to the top before the section swaps, rather than the new page snapping
 * in at whatever scroll offset the old one was left at.
 */
export function smoothScrollToTop(opts?: { instant?: boolean }): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const start =
    window.scrollY || document.documentElement.scrollTop || 0;
  if (start < 2) return Promise.resolve();

  if (opts?.instant) {
    window.scrollTo(0, 0);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const proxy = { y: start };
    gsap.to(proxy, {
      y: 0,
      duration: Math.min(1, 0.4 + start / 3600),
      ease: "power2.inOut",
      overwrite: true,
      onUpdate: () => window.scrollTo(0, proxy.y),
      onComplete: () => {
        window.scrollTo(0, 0);
        resolve();
      },
    });
  });
}
