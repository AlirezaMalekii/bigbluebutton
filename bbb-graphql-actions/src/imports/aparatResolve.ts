/**
 * Resolve Aparat embed/share URLs to a direct MP4 playback URL.
 * Aparat iframes have no reliable play/pause/seek API and ignore autoplay,
 * so SafeMeet syncs Aparat by playing the CDN MP4 through BBB external video.
 */

const APARAT_EMBED_SCRIPT_REGEX = /aparat\.com\/embed\/([^?"'\s&/]+)/i;
const APARAT_VIDEOHASH_REGEX = /aparat\.com\/video\/video\/embed\/videohash\/([^/"'\s?&]+)/i;
const APARAT_PAGE_REGEX = /aparat\.com\/v\/(?:e\/)?([^/"'\s?&]+)/i;
const APARAT_HASH_TOKEN = /^[A-Za-z0-9_-]{3,64}$/;
// externalVideo.externalVideoUrl is varchar(500) in bbb_schema.sql
const MAX_EXTERNAL_VIDEO_URL_LENGTH = 500;
const PREFERRED_PROFILES = ['480p', '360p', '720p', '240p', '144p', '1080p'];

type AparatFileLink = {
  profile?: string;
  urls?: string[];
};

const decodeEmbedHtml = (input: string): string => (
  input
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
);

export const extractAparatHash = (input: string): string | null => {
  if (!input) return null;
  const trimmed = decodeEmbedHtml(input.trim());
  if (!/aparat\.com/i.test(trimmed)) return null;

  const scriptMatch = trimmed.match(APARAT_EMBED_SCRIPT_REGEX)?.[1];
  if (scriptMatch && APARAT_HASH_TOKEN.test(scriptMatch)) return scriptMatch;

  const embedMatch = trimmed.match(APARAT_VIDEOHASH_REGEX)?.[1];
  if (embedMatch && APARAT_HASH_TOKEN.test(embedMatch)) return embedMatch;

  const pageMatch = trimmed.match(APARAT_PAGE_REGEX)?.[1];
  if (pageMatch && APARAT_HASH_TOKEN.test(pageMatch)) return pageMatch;

  return null;
};

const pickMp4Url = (fileLinkAll: AparatFileLink[] | undefined): string | null => {
  if (!Array.isArray(fileLinkAll) || fileLinkAll.length === 0) return null;

  const byProfile = new Map<string, string>();
  for (const item of fileLinkAll) {
    const profile = String(item?.profile || '').toLowerCase();
    const url = item?.urls?.[0];
    if (!profile || !url || typeof url !== 'string') continue;
    if (!/\.mp4(\?|$)/i.test(url)) continue;
    if (url.length > MAX_EXTERNAL_VIDEO_URL_LENGTH) continue;
    byProfile.set(profile, url);
  }

  for (const profile of PREFERRED_PROFILES) {
    const url = byProfile.get(profile);
    if (url) return url;
  }

  // Fallback: first valid mp4 under the DB length limit
  for (const item of fileLinkAll) {
    const url = item?.urls?.[0];
    if (typeof url === 'string'
      && /\.mp4(\?|$)/i.test(url)
      && url.length <= MAX_EXTERNAL_VIDEO_URL_LENGTH) {
      return url;
    }
  }
  return null;
};

/**
 * If input is an Aparat share/embed, return a direct MP4 URL for BBB sync.
 * Otherwise return the original URL unchanged.
 */
export const resolveAparatPlaybackUrl = async (inputUrl: string): Promise<string> => {
  const hash = extractAparatHash(inputUrl);
  if (!hash) return inputUrl;

  const apiUrl = `https://www.aparat.com/api/fa/v1/video/video/show/videohash/${encodeURIComponent(hash)}?pr=1&af=1`;
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'SafeMeet-BBB-graphql-actions/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Aparat API HTTP ${response.status} for hash=${hash}`);
  }

  const payload = await response.json() as {
    data?: { attributes?: { file_link_all?: AparatFileLink[]; duration?: number } };
  };
  const mp4Url = pickMp4Url(payload?.data?.attributes?.file_link_all);
  if (!mp4Url) {
    throw new Error(`Aparat API returned no playable MP4 for hash=${hash}`);
  }

  return mp4Url;
};

export default {
  extractAparatHash,
  resolveAparatPlaybackUrl,
};
