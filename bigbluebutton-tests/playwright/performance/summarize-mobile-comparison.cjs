// Export only numeric/allowlisted Android samples; never URLs, device IDs or tile text.
const fs = require('node:fs');
const path = require('node:path');
const [beforePath, experimentPath, output, finalPath] = process.argv.slice(2);
if (!beforePath || !experimentPath || !output) throw new Error('Expected before.jsonl experiment.jsonl output-directory');
fs.mkdirSync(output, { recursive: true });
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const summaries = [];
const inputs = [['before', beforePath], ['discarded-quality-experiment', experimentPath]];
if (finalPath) inputs.push(['final-retry', finalPath]);
for (const [label, file] of inputs) {
  const rows = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  const safe = rows.map((row) => ({
    elapsedSeconds: row.elapsedSeconds,
    taskDurationSeconds: row.browser.taskDurationSeconds,
    scriptDurationSeconds: row.browser.scriptDurationSeconds,
    layoutDurationSeconds: row.browser.layoutDurationSeconds,
    heapMB: row.browser.jsHeapUsedMB,
    pssMB: row.device.totalPssMB,
    visibility: row.web.visibility,
    stage: row.web.performanceProfile.protectionStage,
    videos: row.web.videos.map(({ width, height, totalFrames, droppedFrames, paused }) => (
      { width, height, totalFrames, droppedFrames, paused }
    )),
  }));
  const taskPercent = safe.slice(1).map((row, index) => (
    100 * (row.taskDurationSeconds - safe[index].taskDurationSeconds)
      / (row.elapsedSeconds - safe[index].elapsedSeconds)
  ));
  summaries.push({
    label, samples: safe.length,
    measuredSeconds: safe.at(-1).elapsedSeconds - safe[0].elapsedSeconds,
    medianMainThreadPercent: median(taskPercent),
    meanPssMB: safe.reduce((total, row) => total + row.pssMB, 0) / safe.length,
    stages: [...new Set(safe.map((row) => row.stage))],
    frameProgress: safe.at(-1).videos.map((video, index) => ({
      width: video.width, height: video.height,
      frames: video.totalFrames - safe[0].videos[index].totalFrames,
      dropped: video.droppedFrames - safe[0].videos[index].droppedFrames,
    })),
  });
  fs.writeFileSync(path.join(output, `${label}.jsonl`), `${safe.map(JSON.stringify).join('\n')}\n`);
}
fs.writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify({
  comparison: 'Exploratory single-run comparison; quality experiment discarded, not final-code improvement evidence',
  thermalValidation: false,
  notes: ['USB powered', 'Chrome ps %CPU omitted: not an interval-based process CPU measurement',
    'No 40-minute or low-end-device validation', 'Main thread uses deltas; buffered long-task totals omitted'],
  results: summaries,
}, null, 2)}\n`);
console.log(JSON.stringify(summaries, null, 2));
