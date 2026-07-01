const BBB_WELCOME_MARKERS = [
  'bigbluebutton.org',
  'tutorial videos',
  'BigBlueButton',
  '%%CONFNAME%%',
];

export const stripHtml = (html: string | null | undefined): string => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const isBbbDefaultWelcome = (plain: string): boolean => {
  if (!plain) return true;
  const lower = plain.toLowerCase();
  return BBB_WELCOME_MARKERS.some((marker) => lower.includes(marker.toLowerCase()));
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
}: SessionDetailsContentInput): boolean => {
  const welcomePlain = stripHtml(welcome);
  const modWelcomePlain = stripHtml(welcomeForModerators);

  const hasWelcome = welcomePlain.length > 0 && !isBbbDefaultWelcome(welcomePlain);
  const hasModWelcome = modWelcomePlain.length > 0 && !isBbbDefaultWelcome(modWelcomePlain);

  return hasWelcome || hasModWelcome;
};
