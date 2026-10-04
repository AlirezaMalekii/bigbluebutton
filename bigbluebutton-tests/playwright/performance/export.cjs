// Export numeric/diagnostic records only, with a second redaction pass.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const [destination, ...runs] = process.argv.slice(2);
if (!destination || !runs.length) throw new Error('Destination and run directories are required');
const destinationRoot = path.resolve(destination);
const oldManifestPath = path.join(destinationRoot, 'manifest.json');
if (fs.existsSync(oldManifestPath)) {
  const oldManifest = JSON.parse(fs.readFileSync(oldManifestPath, 'utf8'));
  for (const item of oldManifest) {
    const oldFile = path.resolve(destinationRoot, item.file);
    if (!oldFile.startsWith(`${destinationRoot}${path.sep}`)) throw new Error('Unsafe path in previous manifest');
    fs.rmSync(oldFile, { force: true });
  }
}
const clean = (value) => {
  if (typeof value === 'string') return value.replace(/https?:\/\/[^\s"<>]+/gi, '[redacted-url]')
    .replace(/(?:sessionToken|checksum|password|secret|token)=[^\s&]+/gi, '[redacted]');
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/secret|token|password|checksum|authorization|cookie/i.test(key))
    .filter(([key]) => !['renders', 'stateChanges'].includes(key))
    .map(([key, item]) => [key, clean(item)]));
  return value;
};
const manifest = [];
for (const run of runs) {
  const name = path.basename(run);
  const folder = path.join(destination, name);
  fs.mkdirSync(folder, { recursive: true });
  for (const file of ['metadata.json', 'samples.jsonl', 'live51-samples.jsonl', 'failures.json', 'actions.json']) {
    const source = path.join(run, file);
    if (!fs.existsSync(source)) continue;
    const raw = fs.readFileSync(source, 'utf8');
    const contents = file.endsWith('.jsonl')
      ? raw.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.stringify(clean(JSON.parse(line)))).join('\n') + '\n'
      : JSON.stringify(clean(JSON.parse(raw)), null, 2) + '\n';
    fs.writeFileSync(path.join(folder, file), contents);
    manifest.push({ file: `${name}/${file}`, bytes: Buffer.byteLength(contents),
      sha256: createHash('sha256').update(contents).digest('hex') });
  }
}
fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Exported ${manifest.length} sanitized records; screenshots and traces excluded`);
