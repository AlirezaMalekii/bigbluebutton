export type BackgroundMusicCatalogTrack = {
  id: string;
  filename: string;
  labelId: string;
};

export const BACKGROUND_MUSIC_TRACKS: BackgroundMusicCatalogTrack[] = [
  {
    id: 'calm-sea',
    filename: 'psyai-calm-sea-relaxing-background-for-sleep-and-meditation-463706.mp3',
    labelId: 'app.skyroom.backgroundMusic.track.calmSea',
  },
  {
    id: 'balanced-nature',
    filename: 'roomeet_balanced_nature_loop_friendly.mp3',
    labelId: 'app.skyroom.backgroundMusic.track.balancedNature',
  },
  {
    id: 'deep-focus',
    filename: 'roomeet_balanced_subclair_loop_friendly.mp3',
    labelId: 'app.skyroom.backgroundMusic.track.deepFocus',
  },
  {
    id: 'calm',
    filename: 'roomeet_calm_loop_friendly.mp3',
    labelId: 'app.skyroom.backgroundMusic.track.calm',
  },
  {
    id: 'energetic',
    filename: 'roomeet_energetic_loop_friendly.mp3',
    labelId: 'app.skyroom.backgroundMusic.track.energetic',
  },
  {
    id: 'focus',
    filename: 'roomeet_focus_loop_friendly.wav',
    labelId: 'app.skyroom.backgroundMusic.track.focus',
  },
  {
    id: 'movement',
    filename: 'roomeet_movement_loop_friendly.mp3',
    labelId: 'app.skyroom.backgroundMusic.track.movement',
  },
  {
    id: 'meditation',
    filename: 'siarhei_korbut-meditation-ambient-loop-pixabay-316844.mp3',
    labelId: 'app.skyroom.backgroundMusic.track.meditation',
  },
  {
    id: 'soft-air',
    filename: 'soft_air_drift_loop.mp3',
    labelId: 'app.skyroom.backgroundMusic.track.softAir',
  },
];

export const getBackgroundMusicCatalogTrack = (trackId?: string) => (
  BACKGROUND_MUSIC_TRACKS.find((track) => track.id === trackId)
);

export const getBackgroundMusicAssetUrl = (trackId: string): string | null => {
  const track = getBackgroundMusicCatalogTrack(trackId);
  if (!track) return null;

  const { cdn, basename } = window.meetingClientSettings.public.app;
  return `${cdn}${basename}/resources/music/${encodeURIComponent(track.filename)}`;
};
