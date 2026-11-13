import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(command, ["--yes", "@playwright/mcp@0.0.85", "--headless"], {
  stdio: ["pipe", "pipe", "pipe"],
  env: process.env,
});

let stdoutBuffer = "";
let stderr = "";
let nextId = 1;
const pending = new Map();

child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  stdoutBuffer += chunk;
  let newline;
  while ((newline = stdoutBuffer.indexOf("\n")) !== -1) {
    const line = stdoutBuffer.slice(0, newline).trim();
    stdoutBuffer = stdoutBuffer.slice(newline + 1);
    if (!line) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      continue;
    }
    if (message.id !== undefined && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message ?? "MCP request failed"));
      else resolve(message.result);
    }
  }
});
child.stderr.on("data", (chunk) => { stderr += chunk; });

function request(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timed out waiting for MCP ${method}`));
    }, 30000);
    pending.set(id, {
      resolve: (value) => { clearTimeout(timeout); resolve(value); },
      reject: (error) => { clearTimeout(timeout); reject(error); },
    });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

try {
  const initialized = await request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "waveradar-playwright-smoke-test", version: "1.0.0" },
  });
  if (!initialized?.serverInfo?.name) throw new Error("MCP initialize response did not identify the server");

  child.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    method: "notifications/initialized",
    params: {},
  }) + "\n");

  const result = await request("tools/list");
  const names = new Set((result?.tools ?? []).map((tool) => tool.name));
  const required = ["browser_navigate", "browser_snapshot"];
  const missing = required.filter((name) => !names.has(name));
  if (missing.length) throw new Error(`Missing expected browser tools: ${missing.join(", ")}`);

  console.log(`PASS: Playwright MCP initialized (${initialized.serverInfo.name}); ${names.size} tools exposed; required tools present.`);
} catch (error) {
  console.error("FAIL:", error.message);
  if (stderr.trim()) console.error(stderr.trim().slice(-4000));
  process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
  setTimeout(() => child.kill("SIGKILL"), 2000).unref();
}
