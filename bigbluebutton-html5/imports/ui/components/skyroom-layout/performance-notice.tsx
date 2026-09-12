import React, { useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { notify } from '/imports/ui/services/notification';
import {
  getSkyroomProtectionStage,
  SKYROOM_PERFORMANCE_TIER_EVENT,
} from './performance-profile';
import { isSkyroomTheme } from './panel-toggles';

interface PerformanceToastCloseButtonProps {
  closeToast?: () => void;
  label: string;
}

const PerformanceToastCloseButton = ({
  closeToast,
  label,
}: PerformanceToastCloseButtonProps) => (
  <button
    type="button"
    className="skyroom-performance-toast-close"
    data-test="safemeetPerformanceNoticeClose"
    aria-label={label}
    onClick={closeToast}
  >
    ×
  </button>
);

const SkyroomPerformanceNotice: React.FC = () => {
  const intl = useIntl();
  const adaptiveEnabled = window.meetingClientSettings?.public
    ?.safemeetPerformance?.adaptiveProtectionEnabled === true;
  const lastNotifiedStage = useRef('none');

  useEffect(() => {
    if (!adaptiveEnabled || !isSkyroomTheme()) return () => {};
    const notifyStage = () => {
      const stage = getSkyroomProtectionStage();
      if (stage === 'none') {
        lastNotifiedStage.current = stage;
        return;
      }
      if (stage === lastNotifiedStage.current) return;
      lastNotifiedStage.current = stage;
      notify(
        intl.formatMessage({ id: `app.skyroom.performance.notice.${stage}` }),
        'info',
        'video',
        {
          autoClose: 5000,
          closeButton: (
            <PerformanceToastCloseButton
              label={intl.formatMessage({ id: 'app.skyroom.performance.notice.dismiss' })}
            />
          ),
          closeOnClick: true,
          toastId: 'safemeet-performance-protection',
        },
      );
    };
    notifyStage();
    window.addEventListener(SKYROOM_PERFORMANCE_TIER_EVENT, notifyStage);
    return () => window.removeEventListener(SKYROOM_PERFORMANCE_TIER_EVENT, notifyStage);
  }, [adaptiveEnabled, intl]);

  return null;
};

export default SkyroomPerformanceNotice;
