import React from 'react';

const readLocaleCandidates = (): string[] => {
  const candidates: string[] = [];

  const push = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      candidates.push(value.trim().toLowerCase());
    }
  };

  push(document.documentElement.lang);
  push(document.documentElement.getAttribute('data-locale'));
  const application = window.meetingClientSettings?.public?.app?.defaultSettings?.application;
  push(application?.overrideLocale);
  push(application?.fallbackLocale);

  try {
    const raw = window.localStorage.getItem('BBB_user_settings')
      || window.sessionStorage.getItem('BBB_user_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      push(parsed?.bbb_override_default_locale);
    }
  } catch {
    // ignore parse errors during bootstrap
  }

  push(navigator.language);

  return candidates;
};

/** Runs before IntlProvider mounts — do not use useIntl here. */
const getLoadingLabel = (): string => {
  const candidates = readLocaleCandidates();
  const isPersian = candidates.some((locale) => locale.startsWith('fa'))
    || document.documentElement.getAttribute('dir') === 'rtl'
    || document.documentElement.getAttribute('data-skyroom') === 'true';

  return isPersian ? 'در حال اتصال…' : 'Connecting…';
};

const SkyroomLoadingScreen: React.FC = () => (
  <div className="skyroom-loading-screen" data-test="loadingScreen">
    <div className="skyroom-loading-screen__spinner-wrap" aria-hidden>
      <div className="skyroom-loading-screen__ring" />
      <div className="skyroom-loading-screen__ring skyroom-loading-screen__ring--inner" />
      <div className="skyroom-loading-screen__dot" />
    </div>
    <p className="skyroom-loading-screen__label">
      {getLoadingLabel()}
    </p>
  </div>
);

export default SkyroomLoadingScreen;
