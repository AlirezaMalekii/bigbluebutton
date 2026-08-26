import {
  getBrandingThemeId,
  SKYROOM_PLATFORM_ICON_PATH,
  SKYROOM_PLATFORM_LOGO_PATH,
  SKYROOM_PLATFORM_URL,
  SKYROOM_ROOMEET_ICON_PATH,
  SKYROOM_ROOMEET_LOGO_COMPACT_PATH,
  SKYROOM_ROOMEET_LOGO_PATH,
  SKYROOM_ROOMEET_URL,
  SKYROOM_PLATFORM_LOGO_COMPACT_PATH,
} from '/imports/ui/components/skyroom-layout/white-label';

export { getBrandingThemeId };

export type MeetingLogoSource = 'custom' | 'roomeet' | 'safemeet';

export type MeetingLogoResolution = {
  source: MeetingLogoSource;
  src: string;
  href: string;
  iconOnly: boolean;
};

type ResolveMeetingLogoArgs = {
  customLogoUrl?: string;
  customDarkLogoUrl?: string;
  loginUrl?: string;
  darkMode?: boolean;
  preferIcon?: boolean;
  hideTagline?: boolean;
};

const getClientBasename = () => (
  window.meetingClientSettings?.public?.app?.basename ?? ''
);

export const getConfiguredLogoLinkUrl = () => (
  window.meetingClientSettings?.public?.app?.branding?.logoLinkUrl?.trim() ?? ''
);

const packagedAsset = (path: string) => `${getClientBasename()}${path}`;

const isInstallerDefaultLogo = (url: string) => (
  /\/safemeet\/logo\.(svg|png|webp|gif|jpe?g)(?:[?#]|$)/i.test(url)
);

/**
 * Logo click URL priority:
 * 1. Per-meeting create param `loginURL` (SafeMeet panel `logo_link` / web service)
 * 2. Server install/update branding `logoLinkUrl` (bbb-html5.yml / repo theme)
 * 3. Packaged brand homepage for the active themeId
 */
export const resolveLogoClickHref = (loginUrl = ''): string => {
  const meetingLoginUrl = loginUrl.trim();
  if (meetingLoginUrl) return meetingLoginUrl;

  const installLogoLinkUrl = getConfiguredLogoLinkUrl();
  if (installLogoLinkUrl) return installLogoLinkUrl;

  return getBrandingThemeId() === 'roomeet'
    ? SKYROOM_ROOMEET_URL
    : SKYROOM_PLATFORM_URL;
};

/**
 * One meeting logo:
 * 1. create `logo` / meeting customLogoUrl replaces the platform mark
 *    unless it is the installer default `/safemeet/logo.svg` (often the
 *    light lockup, unreadable on the dark meeting UI)
 * 2. else `--theme-id roomeet` uses the packaged RooMeet dark lockup
 * 3. else the packaged SafeMeet lockup (install default)
 *
 * Click target follows {@link resolveLogoClickHref}.
 */
export const resolveSkyroomMeetingLogo = ({
  customLogoUrl = '',
  customDarkLogoUrl = '',
  loginUrl = '',
  darkMode = true,
  preferIcon = false,
  hideTagline = false,
}: ResolveMeetingLogoArgs): MeetingLogoResolution => {
  const rawCustom = (darkMode && customDarkLogoUrl ? customDarkLogoUrl : customLogoUrl).trim();
  const customSrc = (rawCustom && !isInstallerDefaultLogo(rawCustom)) ? rawCustom : '';
  const isRoomeet = getBrandingThemeId() === 'roomeet';
  const href = resolveLogoClickHref(loginUrl);

  if (customSrc) {
    return {
      source: 'custom',
      src: customSrc,
      href,
      iconOnly: preferIcon,
    };
  }

  if (isRoomeet) {
    // Meeting UI is dark-first; the light lockup (navy wordmark) is unreadable
    // on the dark header if darkMode has not been applied yet.
    let path = SKYROOM_ROOMEET_LOGO_PATH;
    if (preferIcon) path = SKYROOM_ROOMEET_ICON_PATH;
    else if (hideTagline) path = SKYROOM_ROOMEET_LOGO_COMPACT_PATH;
    return {
      source: 'roomeet',
      src: packagedAsset(path),
      href,
      iconOnly: preferIcon,
    };
  }

  let safemeetPath = SKYROOM_PLATFORM_LOGO_PATH;
  if (preferIcon) safemeetPath = SKYROOM_PLATFORM_ICON_PATH;
  else if (hideTagline) safemeetPath = SKYROOM_PLATFORM_LOGO_COMPACT_PATH;

  return {
    source: 'safemeet',
    src: packagedAsset(safemeetPath),
    href,
    iconOnly: preferIcon,
  };
};
