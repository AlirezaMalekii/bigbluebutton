export type SkyroomFileTypeKind =
  | 'pdf'
  | 'audio'
  | 'video'
  | 'image'
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'text'
  | 'generic';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Convert Eastern Arabic / Persian digits so extensions like `.mp۳` match. */
export const toAsciiDigits = (value: string): string => (
  value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = PERSIAN_DIGITS.indexOf(digit);
    if (persianIndex >= 0) return String(persianIndex);
    const arabicIndex = ARABIC_INDIC_DIGITS.indexOf(digit);
    if (arabicIndex >= 0) return String(arabicIndex);
    return digit;
  })
);

export const getFilenameExtension = (filename?: string | null): string => {
  if (!filename || typeof filename !== 'string') return '';
  const normalized = toAsciiDigits(filename.trim());
  const parts = normalized.split('.');
  if (parts.length < 2) return '';
  return parts.pop()?.toLowerCase() || '';
};

const EXT_TO_KIND: Record<string, SkyroomFileTypeKind> = {
  pdf: 'pdf',

  mp3: 'audio',
  m4a: 'audio',
  aac: 'audio',
  ogg: 'audio',
  wav: 'audio',
  flac: 'audio',
  opus: 'audio',

  mp4: 'video',
  mov: 'video',
  webm: 'video',
  m4v: 'video',
  avi: 'video',
  mkv: 'video',

  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  webp: 'image',
  svg: 'image',
  gif: 'image',
  bmp: 'image',

  doc: 'word',
  docx: 'word',
  odt: 'word',
  rtf: 'word',

  xls: 'excel',
  xlsx: 'excel',
  ods: 'excel',
  csv: 'excel',

  ppt: 'powerpoint',
  pptx: 'powerpoint',
  odp: 'powerpoint',
  odg: 'powerpoint',

  txt: 'text',
  md: 'text',
};

export const getSkyroomFileTypeKind = (filename?: string | null): SkyroomFileTypeKind => {
  const ext = getFilenameExtension(filename);
  return EXT_TO_KIND[ext] || 'generic';
};
