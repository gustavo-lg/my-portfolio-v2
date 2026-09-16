// CDP screenshot harness: navigates to a URL at a given viewport size and
// captures PNG screenshots at a list of millisecond offsets after navigation,
// so the entry formation can be inspected frame-by-frame instead of guessed.
// Uso: node scratchpad/shot.mjs <url> <width>x<height> <outPrefix> <ms1,ms2,...>
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findChrome } from "./findChrome.mjs";

const url = process.argv[2] || "http://localhost:4174/";
const [width, height] = (process.argv[3] || "1920x1080").split("x").map(Number);
const outPrefix = process.argv[4] || "shot";
const offsets = (process.argv[5] || "0,1100,2200,3300,4400,5000")
  .split(",")
  .map(Number);

const chromePath = findChrome();
const debugPort = 9555;
const userDataDir = mkdtempSync(join(tmpdir(), "shot-chrome-"));

function wsRequest(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e9);
    const onMessage = (ev) => {
      const msg = JSON.parse(ev.data.toString());
      if (msg.id === id) {
        ws.removeEventListener("message", onMessage);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
    ws.addEventListener("message", onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  const chrome = spawn(
    chromePath,
    [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      `--window-size=${width},${height + 90}`,
      url,
    ],
    { stdio: "ignore" },
  );

  try {
    let targets;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 300));
      try {
        const res = await fetch(`http://127.0.0.1:${debugPort}/json`);
        targets = await res.json();
        if (targets.length) break;
      } catch {
        // chrome ainda subindo
      }
    }
    const pageTarget = targets.find((t) => t.type === "page");
    if (!pageTarget) throw new Error("nenhum target de pagina encontrado");

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });

    await wsRequest(ws, "Page.enable");
    await wsRequest(ws, "Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });

    const navStart = performance.now();
    const navDone = new Promise((resolve) => {
      const onMessage = (ev) => {
        const msg = JSON.parse(ev.data.toString());
        if (msg.method === "Page.loadEventFired") {
          ws.removeEventListener("message", onMessage);
          resolve();
        }
      };
      ws.addEventListener("message", onMessage);
    });
    await wsRequest(ws, "Page.navigate", { url });
    await navDone;
    const navElapsed = performance.now() - navStart;

    for (const offset of offsets) {
      const wait = Math.max(0, offset - navElapsed);
      await new Promise((r) => setTimeout(r, wait));
      const { data } = await wsRequest(ws, "Page.captureScreenshot", {
        format: "png",
      });
      const path = join(
        process.cwd(),
        "scratchpad",
        `${outPrefix}-${width}x${height}-${offset}ms.png`,
      );
      writeFileSync(path, Buffer.from(data, "base64"));
      console.log(`saved ${path}`);
    }

    ws.close();
  } finally {
    try {
      execFileSync("taskkill", ["/PID", String(chrome.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } catch {
      chrome.kill();
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
