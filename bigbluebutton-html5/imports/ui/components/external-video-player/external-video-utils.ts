import ReactPlayer from 'react-player';

const YOUTUBE_SHORTS_REGEX = /^(?:https?:\/\/)?(?:www\.)?(youtube\.com\/shorts)\/.+$/;
const PANOPTO_MATCH_URL = /https?:\/\/([^/]+\/Panopto)(\/Pages\/Viewer\.aspx\?id=)([-a-zA-Z0-9]+)/;
const DAILYMOTION_MATCH_URL = /https?:\/\/(?:www\.)?dailymotion\.com\/video\/[a-zA-Z0-9]+(?:\?[^\s]*)?/g;
const YOUTUBE_REGEX = /^(?:https?:\/\/)?(?:www\.)?(youtube\.com|youtu\.be)\/.+$/;

const APARAT_EMBED_SCRIPT_REGEX = /aparat\.com\/embed\/([^?"'\s&]+)/i;
const APARAT_VIDEOHASH_REGEX = /aparat\.com\/video\/video\/embed\/videohash\/([^/"'\s?&]+)/i;
const APARAT_PAGE_REGEX = /aparat\.com\/v\/([^/"'\s?&]+)/i;

export const APARAT_EMBED_HOST = 'www.aparat.com';

export type AparatEmbedOptions = {
  autoplay?: boolean;
  muted?: boolean;
  hideTitle?: boolean;
};

export const extractAparatHash = (input: string): string | null => {
  if (!input) return null;
  const trimmed = input.trim();
  const scriptMatch = trimmed.match(APARAT_EMBED_SCRIPT_REGEX);
  if (scriptMatch?.[1]) return scriptMatch[1];
  const embedMatch = trimmed.match(APARAT_VIDEOHASH_REGEX);
  if (embedMatch?.[1]) return embedMatch[1];
  const pageMatch = trimmed.match(APARAT_PAGE_REGEX);
  if (pageMatch?.[1]) return pageMatch[1];
  return null;
};

export const buildAparatEmbedUrl = (
  hash: string,
  options: AparatEmbedOptions = {},
): string => {
  const params = new URLSearchParams();
  params.set('data[responsive]', 'yes');
  if (options.hideTitle !== false) {
    params.set('titleShow', 'false');
  }
  if (options.autoplay) {
    params.set('autoplay', 'true');
  }
  if (options.muted) {
    params.set('muted', 'true');
  }
  return `https://${APARAT_EMBED_HOST}/video/video/embed/videohash/${hash}/vt/frame?${params.toString()}`;
};

export const isAparatEmbedUrl = (url: string): boolean => (
  APARAT_VIDEOHASH_REGEX.test(url) || APARAT_EMBED_SCRIPT_REGEX.test(url)
);

export const parseAparatEmbed = (input: string): string | null => {
  const hash = extractAparatHash(input);
  if (!hash) return null;
  return buildAparatEmbedUrl(hash);
};

export const isAparatVideoUrl = (url: string): boolean => {
  if (!url) return false;
  return isAparatEmbedUrl(url) || !!parseAparatEmbed(url);
};

export const isDirectVideoUrlValid = (url: string): boolean => {
  if (parseAparatEmbed(url)) return true;
  if (isAparatEmbedUrl(url)) return true;

  if (YOUTUBE_SHORTS_REGEX.test(url)) {
    const shortsUrl = url.replace('shorts/', 'watch?v=');
    return /^https.*$/.test(shortsUrl)
      && (ReactPlayer.canPlay(shortsUrl) || PANOPTO_MATCH_URL.test(url));
  }

  if (DAILYMOTION_MATCH_URL.test(url)) {
    return false;
  }

  return /^https.*$/.test(url) && (ReactPlayer.canPlay(url) || PANOPTO_MATCH_URL.test(url));
};

export const normalizeVideoUrl = (url: string): string => {
  const trimmed = url.trim();
  const aparatUrl = parseAparatEmbed(trimmed);
  if (aparatUrl) return aparatUrl;

  let externalVideoUrl = trimmed;

  if (YOUTUBE_SHORTS_REGEX.test(trimmed)) {
    externalVideoUrl = trimmed.replace('shorts/', 'watch?v=');
  } else if (PANOPTO_MATCH_URL.test(trimmed)) {
    const m = trimmed.match(PANOPTO_MATCH_URL);
    if (m && m.length >= 4) {
      externalVideoUrl = `https://${m[1]}/Podcast/Social/${m[3]}.mp4`;
    }
  }

  if (YOUTUBE_REGEX.test(externalVideoUrl)) {
    const YTUrl = new URL(externalVideoUrl);
    YTUrl.searchParams.delete('list');
    YTUrl.searchParams.delete('index');
    externalVideoUrl = YTUrl.toString();
  }

  return externalVideoUrl;
};

export default {
  buildAparatEmbedUrl,
  extractAparatHash,
  isAparatEmbedUrl,
  isAparatVideoUrl,
  parseAparatEmbed,
  isDirectVideoUrlValid,
  normalizeVideoUrl,
};
