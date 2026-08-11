import { notify } from '/imports/ui/services/notification';
import { getVideoState, getConnectingStream } from '/imports/ui/components/video-provider/state';
import { getSkyroomMobileActiveBox } from './mobile-bottom-state';

const TOAST_ID = 'skyroom-webcam-tab-minimized';
const AUTO_CLOSE_MS = 10000;

const MESSAGE_FA = 'تب وب‌کم کوچک شد، اما دوربین شما هنوز روشن است و دیگران آن را می‌بینند. برای خاموش کردن، دکمه دوربین پایین صفحه را بزنید.';
const MESSAGE_EN = 'The webcam tab is minimized, but your camera is still on and others can see you. To turn it off, tap the camera button at the bottom.';

const isFaLocale = () => {
  const lang = typeof document !== 'undefined'
    ? (document.documentElement.getAttribute('lang') || '')
    : '';
  return lang.toLowerCase().startsWith('fa');
};

const isLocalCameraLive = () => {
  const { isConnected, isConnecting } = getVideoState();
  return Boolean(isConnected || isConnecting || getConnectingStream());
};

/**
 * When leaving the mobile webcams tab while the local camera is still sharing,
 * tell the user the tab hid — the camera did not stop.
 */
export const notifyIfLeavingWebcamTab = (nextBox) => {
  if (getSkyroomMobileActiveBox() !== 'webcams' || nextBox === 'webcams') return;
  if (!isLocalCameraLive()) return;

  notify(
    isFaLocale() ? MESSAGE_FA : MESSAGE_EN,
    'info',
    'video',
    {
      autoClose: AUTO_CLOSE_MS,
      toastId: TOAST_ID,
      closeOnClick: true,
    },
  );
};
