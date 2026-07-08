import React, { useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { IntlProvider } from 'react-intl';
import apolloContextHolder from '/imports/ui/core/graphql/apolloContextHolder/apolloContextHolder';
import OverlayLayoutProvider from './overlay-layout-provider';
import ScreenShareChatOverlayPanel from './component';
import { OverlayOpenOptions } from './types';
import {
  registerOverlayRenderer,
  overlayVisibilityVar,
} from './service';

interface OverlayRootProps extends OverlayOpenOptions {
  hostWindow: Window;
}

const OverlayRoot: React.FC<OverlayRootProps> = ({
  hostWindow,
  isRTL,
  locale,
  messages,
}) => {
  useEffect(() => {
    const handleVisibility = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.visibility) {
        overlayVisibilityVar(event.detail.visibility);
      }
    };

    const handleClose = () => {
      overlayVisibilityVar('closed');
      if (!hostWindow.closed) {
        hostWindow.close();
      }
    };

    window.addEventListener('bbb-screen-share-chat-overlay-visibility', handleVisibility);
    window.addEventListener('bbb-screen-share-chat-overlay-closed', handleClose);

    return () => {
      window.removeEventListener('bbb-screen-share-chat-overlay-visibility', handleVisibility);
      window.removeEventListener('bbb-screen-share-chat-overlay-closed', handleClose);
    };
  }, [hostWindow]);

  const apolloClient = apolloContextHolder.getClient();
  const normalizedLocale = locale.replace('_', '-').replace('@', '-');

  return (
    <ApolloProvider client={apolloClient}>
      <IntlProvider
        locale={normalizedLocale}
        messages={messages}
        fallbackOnEmptyString={false}
      >
        <OverlayLayoutProvider isRTL={isRTL}>
          <ScreenShareChatOverlayPanel isRTL={isRTL} />
        </OverlayLayoutProvider>
      </IntlProvider>
    </ApolloProvider>
  );
};

export const setupOverlayRenderer = (): void => {
  registerOverlayRenderer((targetWindow, rootEl, options) => {
    const root: Root = createRoot(rootEl);
    root.render(
      <OverlayRoot
        hostWindow={targetWindow}
        isRTL={options.isRTL}
        locale={options.locale}
        messages={options.messages}
      />,
    );
    return root;
  });
};

export default OverlayRoot;
