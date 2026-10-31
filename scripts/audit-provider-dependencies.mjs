import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const roots = ['src', 'base44', 'native', '.github/workflows'];
const explicitFiles = ['package.json', 'vite.config.js', 'capacitor.config.ts', 'MIGRATION.md'];
const ignoredDirs = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);
const findings = [];

const vendorPackagePrefixes = [
  { provider: 'Base44', prefix: '@base44/' },
  { provider: 'Stripe', prefix: '@stripe/' },
];
const packageManifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
  for (const [name, version] of Object.entries(packageManifest[section] || {})) {
    const match = vendorPackagePrefixes.find(item => name.startsWith(item.prefix));
    if (match) findings.push({
      file: 'package.json',
      line: 1,
      category: 'vendor-package',
      provider: match.provider,
      package: name,
      version,
      dependencySection: section,
    });
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(path.join(dir, entry.name));
      continue;
    }
    if (!/\.(?:[cm]?[jt]sx?|json|ya?ml|md)$/.test(entry.name)) continue;
    inspect(path.join(dir, entry.name));
  }
}

function inspect(file) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  const source = fs.readFileSync(file, 'utf8');
  const rules = [
    ['base44-sdk-import', /(?:from\s*|import\s*\(|require\s*\()\s*['"]@base44\/(?:sdk|vite-plugin)/g],
    ['base44-sdk-reference', /@base44\/(?:sdk|vite-plugin)/g],
    ['hosted-runtime-url', /waveradar-20\.hatchable\.site|WAVERADAR_HOSTED_URL/g],
    ['base44-function-or-client', /base44Client|base44\/functions|base44\.functions/g],
  ];
  for (const [category, regex] of rules) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(source)) !== null) {
      const line = source.slice(0, match.index).split('\n').length;
      findings.push({ file: relative, line, category, token: match[0] });
      if (match[0].length === 0) regex.lastIndex += 1;
    }
  }
}

for (const dir of roots) walk(path.join(root, dir));
for (const file of explicitFiles) if (fs.existsSync(path.join(root, file))) inspect(path.join(root, file));

const unique = [...new Map(findings.map(item => [JSON.stringify(item), item])).values()]
  .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.category.localeCompare(b.category));
const counts = Object.fromEntries([...new Set(unique.map(item => item.category))].sort().map(category => [category, unique.filter(item => item.category === category).length]));
const report = { generatedAt: new Date().toISOString(), scope: [...roots, ...explicitFiles], totalFindings: unique.length, counts, findings: unique };
console.log(JSON.stringify(report, null, 2));
if (!unique.some(item => item.category === 'base44-sdk-reference')) {
  console.error('Provider dependency audit did not detect the expected Base44 SDK reference; check scan scope or source layout.');
  process.exit(1);
}
