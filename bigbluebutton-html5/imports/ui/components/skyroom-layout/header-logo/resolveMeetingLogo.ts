import {
  SKYROOM_PLATFORM_ICON_PATH,
  SKYROOM_PLATFORM_LOGO_PATH,
  SKYROOM_PLATFORM_URL,
  SKYROOM_ROOMEET_ICON_PATH,
  SKYROOM_ROOMEET_LOGO_LIGHT_PATH,
  SKYROOM_ROOMEET_LOGO_PATH,
  SKYROOM_ROOMEET_URL,
} from '/imports/ui/components/skyroom-layout/white-label';

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
};

const getClientBasename = () => (
  window.meetingClientSettings?.public?.app?.basename ?? ''
);

export const getBrandingThemeId = () => (
  window.meetingClientSettings?.public?.app?.branding?.themeId?.trim().toLowerCase() ?? ''
);

export const getConfiguredLogoLinkUrl = () => (
  window.meetingClientSettings?.public?.app?.branding?.logoLinkUrl?.trim() ?? ''
);

const packagedAsset = (path: string) => `${getClientBasename()}${path}`;

/**
 * One meeting logo:
 * 1. `--logo-url` / meeting customLogoUrl replaces the platform mark
 * 2. else `--theme-id roomeet` uses the packaged RooMeet lockup
 * 3. else the packaged SafeMeet lockup
 *
 * `--logo-link-url` always wins for the click target.
 */
export const resolveSkyroomMeetingLogo = ({
  customLogoUrl = '',
  customDarkLogoUrl = '',
  loginUrl = '',
  darkMode = true,
  preferIcon = false,
}: ResolveMeetingLogoArgs): MeetingLogoResolution => {
  const customSrc = (darkMode && customDarkLogoUrl ? customDarkLogoUrl : customLogoUrl).trim();
  const logoLinkUrl = getConfiguredLogoLinkUrl();
  const isRoomeet = getBrandingThemeId() === 'roomeet';
  const packagedHref = isRoomeet ? SKYROOM_ROOMEET_URL : SKYROOM_PLATFORM_URL;
  const href = logoLinkUrl || (customSrc ? loginUrl.trim() : '') || packagedHref;

  if (customSrc) {
    return {
      source: 'custom',
      src: customSrc,
      href,
      iconOnly: preferIcon,
    };
  }

  if (isRoomeet) {
    let path = SKYROOM_ROOMEET_LOGO_PATH;
    if (preferIcon) {
      path = SKYROOM_ROOMEET_ICON_PATH;
    } else if (!darkMode) {
      path = SKYROOM_ROOMEET_LOGO_LIGHT_PATH;
    }
    return {
      source: 'roomeet',
      src: packagedAsset(path),
      href,
      iconOnly: preferIcon,
    };
  }

  return {
    source: 'safemeet',
    src: packagedAsset(preferIcon ? SKYROOM_PLATFORM_ICON_PATH : SKYROOM_PLATFORM_LOGO_PATH),
    href,
    iconOnly: preferIcon,
  };
};
