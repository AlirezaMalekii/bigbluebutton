// Replace only the capture source in the test browser. The app still publishes
// through its normal LiveKit/WebRTC path; this is not an OS-capture test.
exports.start = async (page) => page.evaluate(() => {
  const original = navigator.mediaDevices.getDisplayMedia;
  let stop = () => {};
  navigator.mediaDevices.getDisplayMedia = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 720;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    const paint = () => {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#102030'; ctx.font = '32px Arial';
      ctx.fillText('SafeMeet Performance: ABC 1234567890', 40, 70);
      ctx.fillText('آزمایش خوانایی متن فارسی و English', 40, 130);
      ctx.font = '18px Arial';
      for (let row = 0; row < 8; row += 1) ctx.fillText(`Row ${row + 1}: 1234567890 — SafeMeet`, 40, 190 + row * 35);
      ctx.fillStyle = '#078e80'; ctx.fillRect((frame++ * 8) % 1050, 530, 200, 100);
    };
    paint();
    const timer = setInterval(paint, 100);
    const stream = canvas.captureStream(10);
    const [track] = stream.getVideoTracks();
    track.contentHint = 'detail';
    const nativeStop = track.stop.bind(track);
    track.stop = () => { clearInterval(timer); nativeStop(); };
    stop = () => track.stop();
    return stream;
  };
  window.__stopPerfScreen = () => { stop(); navigator.mediaDevices.getDisplayMedia = original; };
});
exports.stop = async (page) => page.evaluate(() => {
  window.__stopPerfScreen?.(); delete window.__stopPerfScreen;
});
