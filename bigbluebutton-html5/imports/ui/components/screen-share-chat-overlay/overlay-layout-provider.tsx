import React, { useMemo } from 'react';
import { LayoutContextSelector } from '/imports/ui/components/layout/context';
import { INITIAL_INPUT_STATE, INITIAL_OUTPUT_STATE } from '/imports/ui/components/layout/initState';
import { PANELS } from '/imports/ui/components/layout/enums';
import DEFAULT_VALUES from '/imports/ui/components/layout/defaultValues';

interface OverlayLayoutProviderProps {
  children: React.ReactNode;
  isRTL: boolean;
}

const OverlayLayoutProvider: React.FC<OverlayLayoutProviderProps> = ({
  children,
  isRTL,
}) => {
  const CHAT_CONFIG = window.meetingClientSettings.public.chat;
  const publicChatId = CHAT_CONFIG.public_id;

  const layoutValue = useMemo(() => {
    const noopDispatch = () => undefined;

    const state = {
      presentationAreaContentActions: [],
      deviceType: null,
      isRTL,
      layoutType: DEFAULT_VALUES.layoutType,
      layoutLoading: false,
      fontSize: DEFAULT_VALUES.fontSize,
      idChatOpen: publicChatId,
      fullscreen: {
        element: '',
        group: '',
      },
      input: {
        ...INITIAL_INPUT_STATE,
        sidebarContent: {
          ...INITIAL_INPUT_STATE.sidebarContent,
          isOpen: true,
          sidebarContentPanel: PANELS.CHAT,
        },
      },
      output: INITIAL_OUTPUT_STATE,
    };

    return [state, noopDispatch] as const;
  }, [isRTL, publicChatId]);

  return (
    <LayoutContextSelector.Provider value={layoutValue}>
      {children}
    </LayoutContextSelector.Provider>
  );
};

export default OverlayLayoutProvider;
