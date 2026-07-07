const BBB_DEFAULT_WELCOME_SNIPPETS = [
  'for help on using bigbluebutton',
  'tutorial videos',
  'bigbluebutton.org',
];

export const stripHtml = (html: string | null | undefined): string => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const INVALID_DIAL_NUMBERS = ['0', '613-555-1212', '613-555-1234', '0000'];

export const getFormattedDialIn = (voiceSettings?: {
  dialNumber?: string | null;
  telVoice?: string | null;
} | null): { formattedDialNum: string; formattedTelVoice: string } => {
  const dialNumber = voiceSettings?.dialNumber ?? '';
  const telVoice = voiceSettings?.telVoice ?? '';
  if (!dialNumber || !telVoice || INVALID_DIAL_NUMBERS.includes(dialNumber)) {
    return { formattedDialNum: '', formattedTelVoice: '' };
  }
  return { formattedDialNum: dialNumber, formattedTelVoice: telVoice };
};

const isBbbDefaultWelcome = (plain: string): boolean => {
  if (!plain) return true;
  const lower = plain.toLowerCase();
  const matchedSnippets = BBB_DEFAULT_WELCOME_SNIPPETS
    .filter((snippet) => lower.includes(snippet)).length;
  return matchedSnippets >= 2;
};

export interface SessionDetailsContentInput {
  welcome?: string | null;
  welcomeForModerators?: string | null;
  loginUrl?: string | null;
  formattedDialNum?: string | null;
  formattedTelVoice?: string | null;
}

export const hasDisplayableSessionDetails = ({
  welcome = '',
  welcomeForModerators = '',
  loginUrl = '',
  formattedDialNum = '',
  formattedTelVoice = '',
}: SessionDetailsContentInput): boolean => {
  const welcomePlain = stripHtml(welcome);
  const modWelcomePlain = stripHtml(welcomeForModerators);

  const hasWelcome = welcomePlain.length > 0 && !isBbbDefaultWelcome(welcomePlain);
  const hasModWelcome = modWelcomePlain.length > 0 && !isBbbDefaultWelcome(modWelcomePlain);
  const hasLoginUrl = Boolean(loginUrl?.trim());
  const hasDialIn = Boolean(formattedDialNum?.trim() && formattedTelVoice?.trim());

  return hasWelcome || hasModWelcome || hasLoginUrl || hasDialIn;
};
