// Shared Chrome-executable lookup for the CDP harness scripts in this
// directory. Set CHROME_PATH to override on a machine where none of the
// default install locations match.
import { existsSync } from "node:fs";

const DEFAULT_PATHS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

export function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const found = DEFAULT_PATHS.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      "Chrome executable not found. Set CHROME_PATH to its full path.",
    );
  }
  return found;
}
