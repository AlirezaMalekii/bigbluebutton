/* eslint-disable no-await-in-loop, no-restricted-syntax -- Serialize camera mutations and rollback. */
export interface MobilePublishCap {
  maxEdge: number;
  maxFrameRate: number;
}

const upper = (value: ConstrainULong | ConstrainDouble | undefined) => {
  if (typeof value === 'number') return value;
  return value?.max ?? value?.exact ?? value?.ideal;
};

// Compose from the original capture, never from an already reduced frame size.
export const composeMobileCapture = (
  original: MediaTrackSettings,
  profile: MediaTrackConstraints,
  cap: MobilePublishCap | null,
): MediaTrackConstraints => {
  const { width, height } = original;
  if (!width || !height) throw new Error('Camera dimensions unavailable');
  const scale = Math.min(
    1,
    (upper(profile.width) ?? width) / width,
    (upper(profile.height) ?? height) / height,
    cap ? cap.maxEdge / Math.max(width, height) : 1,
  );
  const frameRate = Math.min(
    original.frameRate ?? Infinity,
    upper(profile.frameRate) ?? Infinity,
    cap?.maxFrameRate ?? Infinity,
  );
  return {
    width: { ideal: Math.max(1, Math.floor(width * scale)), max: Math.max(1, Math.floor(width * scale)) },
    height: { ideal: Math.max(1, Math.floor(height * scale)), max: Math.max(1, Math.floor(height * scale)) },
    ...(Number.isFinite(frameRate) ? { frameRate: { ideal: frameRate, max: frameRate } } : {}),
  };
};

export interface CameraProfilePeer {
  peerConnection: RTCPeerConnection | null;
  currentProfileId?: string;
}

interface CameraRequest {
  profileId: string;
  constraints: MediaTrackConstraints;
  bitrate?: number;
  cap: MobilePublishCap | null;
  restore: boolean;
}

interface CameraState {
  pending?: CameraRequest;
  running?: Promise<void>;
  applied?: string;
  appliedTracks?: Array<MediaStreamTrack | null>;
}

// One queue per existing camera peer. Weak ownership adds no timer or polling.
export const createMobileCameraController = () => {
  const peers = new WeakMap<CameraProfilePeer, CameraState>();
  const originals = new WeakMap<MediaStreamTrack, {
    constraints: MediaTrackConstraints;
    settings: MediaTrackSettings;
    encodings: RTCRtpEncodingParameters[];
  }>();
  return {
    has: (peer: CameraProfilePeer) => peers.has(peer),
    apply(peer: CameraProfilePeer, request: CameraRequest): Promise<void> {
      let state = peers.get(peer);
      if (!state) { state = {}; peers.set(peer, state); }
      state.pending = request;
      if (state.running) return state.running;
      const active = state;
      active.running = (async () => {
        while (active.pending) {
          const next = active.pending;
          active.pending = undefined;
          const pc = peer.peerConnection;
          if (!pc || pc.signalingState === 'closed') return;
          const key = JSON.stringify(next);
          const senders = pc.getSenders().filter((s) => s.track?.kind === 'video' && s.track.readyState === 'live');
          if (!senders.length) return;
          if (key === active.applied && senders.length === active.appliedTracks?.length
            && senders.every((sender, index) => sender.track === active.appliedTracks?.[index])) {
            // eslint-disable-next-line no-continue -- Drain only newer queued requests.
            continue;
          }
          for (const sender of senders) {
            const track = sender.track!;
            const parameters = sender.getParameters();
            if (!parameters.encodings?.length) throw new Error('Camera sender not negotiated');
            let original = originals.get(track);
            if (!original) {
              original = {
                constraints: track.getConstraints(),
                settings: track.getSettings(),
                encodings: parameters.encodings.map((e) => ({ ...e })),
              };
              originals.set(track, original);
            }
            const target = next.restore && !next.cap ? original.constraints
              : { ...original.constraints, ...composeMobileCapture(original.settings, next.constraints, next.cap) };
            const previousConstraints = track.getConstraints();
            const previousEncodings = parameters.encodings.map((e) => ({ ...e }));
            parameters.encodings = parameters.encodings.map((existing, index) => {
              const encoding = { ...existing };
              const source = original!.encodings[index] ?? {};
              const fps = upper(target.frameRate);
              const maxFramerate = Math.min(source.maxFramerate ?? Infinity, fps ?? Infinity);
              if (Number.isFinite(maxFramerate)) encoding.maxFramerate = maxFramerate;
              else delete encoding.maxFramerate;
              const bitrate = Math.min(source.maxBitrate ?? Infinity, next.bitrate ? next.bitrate * 1000 : Infinity);
              if (Number.isFinite(bitrate)) encoding.maxBitrate = bitrate;
              else delete encoding.maxBitrate;
              return encoding;
            });
            try {
              await track.applyConstraints(target);
              if (peer.peerConnection !== pc || track.readyState !== 'live') return;
              await sender.setParameters(parameters);
            } catch (error) {
              // Retain the previous working capture on unsupported constraints.
              if (track.readyState === 'live' && peer.peerConnection === pc) {
                await track.applyConstraints(previousConstraints).catch(() => {});
                const rollback = sender.getParameters();
                rollback.encodings = previousEncodings;
                await sender.setParameters(rollback).catch(() => {});
              }
              active.applied = undefined;
              throw error;
            }
          }
          active.applied = key;
          active.appliedTracks = senders.map((sender) => sender.track);
          Object.assign(peer, { currentProfileId: next.profileId });
        }
      })().finally(async () => {
        active.running = undefined;
        // A newer restoration request must survive failure of the in-flight change.
        if (active.pending) await this.apply(peer, active.pending);
      });
      return active.running;
    },
  };
};
