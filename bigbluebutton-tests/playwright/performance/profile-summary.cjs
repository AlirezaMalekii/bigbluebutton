const fs = require('node:fs');
const path = require('node:path');
const { SourceMapConsumer } = require('../../../bigbluebutton-html5/node_modules/source-map');
const input = process.argv[2];
const dist = process.argv[3] || '../../../bigbluebutton-html5/dist';
const profile = JSON.parse(fs.readFileSync(input));
const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
const counts = new Map();
profile.samples.forEach((id, i) => counts.set(id, (counts.get(id) || 0) + profile.timeDeltas[i]));
(async () => {
  const maps = new Map();
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  const grouped = new Map();
  for (const [id, us] of ranked) {
    const frame = nodes.get(id).callFrame;
    const basename = path.basename(frame.url);
    const mapPath = path.resolve(dist, `${basename}.map`);
    let source;
    if (basename && fs.existsSync(mapPath)) {
      if (!maps.has(mapPath)) maps.set(mapPath, await new SourceMapConsumer(JSON.parse(fs.readFileSync(mapPath))));
      source = maps.get(mapPath).originalPositionFor({ line: frame.lineNumber + 1, column: frame.columnNumber });
    }
    const key = source?.source ? `${source.source}:${source.line}:${source.name || ''}` : frame.functionName;
    grouped.set(key, (grouped.get(key) || 0) + us);
  }
  [...grouped].sort((a, b) => b[1] - a[1]).slice(0, 50)
    .forEach(([source, us]) => console.log(JSON.stringify({ ms: Math.round(us / 1000), source })));
  maps.forEach((map) => map.destroy?.());
})();
