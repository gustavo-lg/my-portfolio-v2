// CDP harness: grava intervalo entre requestAnimationFrame antes de qualquer
// script da pagina, reporta engasgos (>40ms) numa janela de tempo.
// Uso: node scratchpad/promo2.mjs [url] [windowMs]
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findChrome } from "./findChrome.mjs";

const url = process.argv[2] || "http://localhost:8081/";
const windowMs = Number(process.argv[3] || 18000);
const chromePath = findChrome();
const debugPort = 9333;
const userDataDir = mkdtempSync(join(tmpdir(), "promo2-chrome-"));

const recorderScript = `
(() => {
  window.__frameLog = [];
  let last = performance.now();
  function tick(t) {
    window.__frameLog.push(t - last);
    last = t;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
`;

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
      "--window-size=1920,1080",
      url,
    ],
    { stdio: "ignore" }
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
    await wsRequest(ws, "Runtime.enable");
    await wsRequest(ws, "Page.addScriptToEvaluateOnNewDocument", {
      source: recorderScript,
    });

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

    console.log(`Navegado para ${url}. Medindo ${windowMs}ms...`);
    await new Promise((r) => setTimeout(r, windowMs));

    const result = await wsRequest(ws, "Runtime.evaluate", {
      expression: "JSON.stringify(window.__frameLog || [])",
      returnByValue: true,
    });
    const deltas = JSON.parse(result.result.value);

    let t = 0;
    const stalls = [];
    for (const d of deltas) {
      t += d;
      if (d > 40) stalls.push({ atMs: Math.round(t), deltaMs: Math.round(d) });
    }

    console.log(`Total de quadros: ${deltas.length}`);
    console.log(`Engasgos (>40ms) em janela de ${windowMs}ms:`);
    if (stalls.length === 0) {
      console.log("  nenhum");
    } else {
      for (const s of stalls) {
        console.log(`  t=${s.atMs}ms  delta=${s.deltaMs}ms`);
      }
    }
    const worst = stalls.reduce((m, s) => (s.deltaMs > m.deltaMs ? s : m), {
      deltaMs: 0,
      atMs: 0,
    });
    console.log(`Pior engasgo: ${worst.deltaMs}ms em t=${worst.atMs}ms`);

    ws.close();
  } finally {
    // chrome.kill() only signals the top PID; on Windows the renderer/GPU
    // child processes survive as orphans and contend for the GPU with every
    // subsequent run. taskkill /T kills the whole tree.
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
