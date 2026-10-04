// Deterministic motion and audio fixtures; generated outside tracked files.
const fs = require('node:fs');
const path = require('node:path');
const directory = path.resolve(process.argv[2] || 'test-results/performance/media');
fs.mkdirSync(directory, { recursive: true });
const width = 640;
const height = 480;
const video = fs.openSync(path.join(directory, 'motion.y4m'), 'w');
fs.writeSync(video, `YUV4MPEG2 W${width} H${height} F30:1 Ip A1:1 C420jpeg\n`);
for (let frame = 0; frame < 90; frame += 1) {
  const buffer = Buffer.alloc(width * height * 3 / 2, 128);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const moving = x >= frame * 5 % width && x < frame * 5 % width + 100 && y > 140 && y < 240;
    buffer[y * width + x] = moving ? 220 : 40 + Math.floor((x + y) / 10) % 100;
  }
  fs.writeSync(video, 'FRAME\n');
  fs.writeSync(video, buffer);
}
fs.closeSync(video);
const samples = 48000 * 10;
const wav = Buffer.alloc(44 + samples * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(48000, 24); wav.writeUInt32LE(96000, 28); wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
for (let i = 0; i < samples; i += 1) wav.writeInt16LE(Math.round(800 * Math.sin(i * 2 * Math.PI * 440 / 48000)), 44 + i * 2);
fs.writeFileSync(path.join(directory, 'tone.wav'), wav);
console.log('Generated 640x480@30 motion and 48kHz audio fixtures');
