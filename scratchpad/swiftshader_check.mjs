import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findChrome } from "./findChrome.mjs";

const url = process.argv[2] || "http://localhost:4174/?perf=1";
const waitMs = Number(process.argv[3] || 30000);
const chromePath = findChrome();
const debugPort = 9777;
const userDataDir = mkdtempSync(join(tmpdir(), "swift-chrome-"));

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
    "--use-gl=swiftshader",
    "--use-angle=swiftshader",
    "--window-size=1920,1080",
    url,
  ], { stdio: "ignore" });

  const lines = [];
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
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data.toString());
      if (msg.method === "Runtime.consoleAPICalled") {
        const args = msg.params.args.map(a => a.value ?? a.description).join(" ");
        if (args.includes("[perf]")) {
          lines.push(args);
          console.log(args);
        }
      }
    });
    await wsRequest(ws, "Page.navigate", { url });
    await new Promise((r) => setTimeout(r, waitMs));
    ws.close();
  } finally {
    try {
      execFileSync("taskkill", ["/PID", String(chrome.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      chrome.kill();
    }
  }

  const probeLines = lines.filter(l => l.startsWith("[perf] probe"));
  console.log(`\n--- ${probeLines.length} probe rounds captured ---`);
  const anyUp = probeLines.some(l => / move=up1 /.test(l));
  console.log(anyUp ? "FALHA: alguma rodada subiu de degrau (up1)" : "OK: nenhuma rodada subiu de degrau");
}
main().catch(e => { console.error(e); process.exit(1); });
