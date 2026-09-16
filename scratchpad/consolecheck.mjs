import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findChrome } from "./findChrome.mjs";

const url = process.argv[2] || "http://localhost:4174/";
const chromePath = findChrome();
const debugPort = 9444;
const userDataDir = mkdtempSync(join(tmpdir(), "consolecheck-chrome-"));

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
  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1920,1080",
    url,
  ], { stdio: "ignore" });

  try {
    let targets;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 300));
      try {
        const res = await fetch(`http://127.0.0.1:${debugPort}/json`);
        targets = await res.json();
        if (targets.length) break;
      } catch {}
    }
    const pageTarget = targets.find((t) => t.type === "page");
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    await wsRequest(ws, "Runtime.enable");
    await wsRequest(ws, "Log.enable");
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data.toString());
      if (msg.method === "Runtime.consoleAPICalled") {
        const args = msg.params.args.map(a => a.value ?? a.description).join(" ");
        console.log(`[console.${msg.params.type}] ${args}`);
      }
      if (msg.method === "Runtime.exceptionThrown") {
        console.log(`[exception] ${JSON.stringify(msg.params.exceptionDetails)}`);
      }
    });
    await new Promise((r) => setTimeout(r, 6000));
    ws.close();
  } finally {
    chrome.kill();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
