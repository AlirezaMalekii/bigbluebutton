// Test-only instrumentation. Never records URLs, SDP, tokens, messages or user IDs.
module.exports = () => {
  const renders = new Map();
  const stateChanges = new Map();
  const lastStates = new WeakMap();
  let commits = 0;
  if (new URL(location.href).searchParams.get('perfReact') === '1') {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      inject: () => 1,
      onCommitFiberUnmount() {},
      onCommitFiberRoot(_id, root) {
        commits += 1;
        const visit = (fiber) => {
          if (!fiber) return;
          if (typeof fiber.type === 'function' && (fiber.flags & 1)) {
            const key = fiber.type.displayName || fiber.type.name || fiber.type.toString().slice(0, 150);
            const old = renders.get(key) || { updates: 0, mounts: 0, code: fiber.type.toString().slice(0, 180) };
            old.updates += 1;
            if (!fiber.alternate) old.mounts += 1;
            renders.set(key, old);
            let hook = fiber.memoizedState;
            let hookIndex = 0;
            while (hook) {
              if (hook.queue && lastStates.has(hook.queue) && hook.memoizedState !== lastStates.get(hook.queue)) {
                const stateKey = `${fiber.type.toString().slice(0, 220)}:hook${hookIndex}`;
                stateChanges.set(stateKey, (stateChanges.get(stateKey) || 0) + 1);
              }
              if (hook.queue) lastStates.set(hook.queue, hook.memoizedState);
              hook = hook.next; hookIndex += 1;
            }
          }
          visit(fiber.child); visit(fiber.sibling);
        };
        visit(root.current);
      },
    };
    // Production intentionally disables DevTools in main.tsx. Keep this isolated
    // test hook alive without changing the production bundle.
    Object.entries(window.__REACT_DEVTOOLS_GLOBAL_HOOK__).forEach(([key, value]) => {
      Object.defineProperty(window.__REACT_DEVTOOLS_GLOBAL_HOOK__, key, {
        enumerable: true, get: () => value, set: () => {},
      });
    });
  }
  const peers = new Set();
  const socketEvents = [];
  const NativeSocket = window.WebSocket;
  window.WebSocket = new Proxy(NativeSocket, {
    construct(Target, args) {
      const socket = new Target(...args);
      const kind = new URL(String(args[0]), location.href).pathname === '/graphql' ? 'graphql' : 'media-or-other';
      socket.addEventListener('close', (event) => {
        socketEvents.push({ kind, code: event.code, clean: event.wasClean, at: performance.now() });
        if (socketEvents.length > 30) socketEvents.shift();
      });
      return socket;
    },
  });
  const captureTracks = new Set();
  const nativeCapture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (...args) => {
    const stream = await nativeCapture(...args);
    stream.getTracks().forEach((track) => captureTracks.add(track));
    return stream;
  };
  const streamKeys = new Map();
  let nextStreamKey = 0;
  const NativePeer = window.RTCPeerConnection;
  window.RTCPeerConnection = new Proxy(NativePeer, {
    construct(Target, args) {
      const peer = new Target(...args);
      peers.add(peer);
      peer.addEventListener('connectionstatechange', () => {
        if (peer.connectionState === 'closed') peers.delete(peer);
      });
      return peer;
    },
  });
  const totals = { longTasks: 0, longTaskMs: 0, attributeWrites: 0, unchangedAttributeWrites: 0 };
  if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
    new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
      totals.longTasks += 1;
      totals.longTaskMs += entry.duration;
    })).observe({ type: 'longtask', buffered: true });
  }
  // Observe the shell only, not the whiteboard or media subtrees.
  document.addEventListener('DOMContentLoaded', () => {
    const discover = new MutationObserver(() => {
      const layout = document.getElementById('layout');
      if (!layout) return;
      discover.disconnect();
      new MutationObserver((entries) => entries.forEach((entry) => {
        totals.attributeWrites += 1;
        if (entry.oldValue === layout.getAttribute(entry.attributeName)) totals.unchangedAttributeWrites += 1;
      })).observe(layout, { attributes: true, attributeOldValue: true });
    });
    discover.observe(document.documentElement, { childList: true, subtree: true });
  });
  const fields = ['kind', 'type', 'bytesReceived', 'bytesSent', 'framesDecoded', 'framesDropped',
    'framesEncoded', 'framesPerSecond', 'frameWidth', 'frameHeight', 'totalDecodeTime',
    'totalEncodeTime', 'freezeCount', 'totalFreezesDuration', 'packetsLost', 'packetsReceived',
    'jitter', 'currentRoundTripTime', 'availableOutgoingBitrate', 'jitterBufferDelay',
    'jitterBufferEmittedCount', 'concealedSamples', 'totalSamplesReceived', 'audioLevel'];
  window.__safemeetPerfSample = async () => {
    for (const track of captureTracks) if (track.readyState === 'ended') captureTracks.delete(track);
    const media = [];
    for (const peer of peers) {
      if (peer.connectionState === 'closed') { peers.delete(peer); continue; }
      try {
        let deadline;
        const reports = await Promise.race([peer.getStats(), new Promise((_, reject) => {
          deadline = setTimeout(() => reject(new Error('stats-timeout')), 1500);
        })]).finally(() => clearTimeout(deadline));
        reports.forEach((report) => {
          if (!['inbound-rtp', 'outbound-rtp', 'candidate-pair'].includes(report.type)) return;
          if (report.type === 'candidate-pair' && report.state !== 'succeeded') return;
          if (!streamKeys.has(report.id)) streamKeys.set(report.id, ++nextStreamKey);
          media.push({ streamKey: streamKeys.get(report.id),
            ...Object.fromEntries(fields.filter((field) => report[field] !== undefined)
              .map((field) => [field, report[field]])) });
        });
      } catch { /* Closing peer; next sample will reflect lifecycle. */ }
    }
    return {
      ...totals, at: performance.now(), peers: peers.size, visibility: document.visibilityState,
      peerStates: [...peers].map((peer) => ({ connection: peer.connectionState, ice: peer.iceConnectionState,
        gathering: peer.iceGatheringState, signaling: peer.signalingState })),
      socketEvents: [...socketEvents],
      activeCaptureTracks: captureTracks.size,
      activeSenderTracks: [...peers].reduce((sum, peer) => sum + peer.getSenders()
        .filter((sender) => sender.track?.readyState === 'live').length, 0),
      activeReceiverTracks: [...peers].reduce((sum, peer) => sum + peer.getReceivers()
        .filter((receiver) => receiver.track?.readyState === 'live').length, 0),
      commits, renders: [...renders].sort((a, b) => b[1].updates - a[1].updates).slice(0, 50),
      stateChanges: [...stateChanges].sort((a, b) => b[1] - a[1]).slice(0, 30),
      tier: document.documentElement.getAttribute('data-skyroom-performance-tier'),
      protectionStage: document.documentElement.getAttribute('data-skyroom-protection-stage'),
      performanceNotice: document.querySelector('.Toastify__toast')?.textContent || null,
      hardwareHints: {
        deviceMemory: navigator.deviceMemory ?? null,
        hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      },
      domNodes: document.getElementsByTagName('*').length,
      media,
      videos: Array.from(document.querySelectorAll('video')).map((video) => ({
        width: video.videoWidth, height: video.videoHeight, time: video.currentTime,
        paused: video.paused, ready: video.readyState,
        rendered: video.getClientRects().length > 0,
        frames: video.getVideoPlaybackQuality?.().totalVideoFrames,
        dropped: video.getVideoPlaybackQuality?.().droppedVideoFrames,
      })),
    };
  };
};
