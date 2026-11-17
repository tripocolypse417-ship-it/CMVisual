import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forbidden = /playwright|puppeteer|selenium|webdriver/i;

const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const dependencies = {
  ...manifest.dependencies,
  ...manifest.devDependencies,
};
const prohibitedPackages = Object.keys(dependencies).filter((name) => forbidden.test(name));
assert.deepEqual(prohibitedPackages, [], "Browser-control packages must not be project dependencies");

const scripts = manifest.scripts ?? {};
const prohibitedScripts = Object.entries(scripts)
  .filter(([name, command]) => forbidden.test(name) || forbidden.test(command))
  .map(([name]) => name);
assert.deepEqual(prohibitedScripts, [], "Package scripts must not launch browser-control tooling");

const mcp = JSON.parse(await readFile(path.join(root, ".mcp.json"), "utf8"));
assert.deepEqual(Object.keys(mcp.mcpServers ?? {}), [], "No browser or remote-control MCP server may be configured");

const workflowRoot = path.join(root, ".github", "workflows");
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (/\.(yml|yaml)$/i.test(entry.name)) files.push(fullPath);
  }
  return files;
}

const workflowFiles = await walk(workflowRoot);
for (const file of workflowFiles) {
  const relative = path.relative(root, file);
  assert.equal(forbidden.test(relative), false, `Workflow filename contains prohibited browser tooling: ${relative}`);
  const content = await readFile(file, "utf8");
  assert.equal(forbidden.test(content), false, `Workflow invokes prohibited browser tooling: ${relative}`);
}

console.log(`PASS: browserless configuration verified across package manifest, MCP configuration, and ${workflowFiles.length} GitHub Actions workflows.`);
