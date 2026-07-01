import React, { useCallback, useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { useMutation } from '@apollo/client';
import {
  PAD_SESSION_SUBSCRIPTION,
  PadSessionSubscriptionResponse,
} from './queries';
import { CREATE_SESSION } from './mutations';
import Service from './service';
import Styled from './styles';
import PadContent from './content/component';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import useMeeting from '/imports/ui/core/hooks/useMeeting';

const intlMessages = defineMessages({
  hint: {
    id: 'app.pads.hint',
    description: 'Label for hint on how to escape iframe',
  },
});

interface PadContainerGraphqlProps {
  externalId: string;
  hasPermission: boolean;
  isResizing: boolean;
  isRTL: boolean;
}

interface PadGraphqlProps extends PadContainerGraphqlProps {
  hasSession: boolean;
  sessionIds: Array<string>;
  padId: string | undefined;
}

const PadGraphql: React.FC<PadGraphqlProps> = (props) => {
  const {
    externalId,
    hasSession,
    isResizing,
    isRTL,
    sessionIds,
    padId,
    hasPermission,
  } = props;
  const [padURL, setPadURL] = useState<string | undefined>();
  const intl = useIntl();

  useEffect(() => {
    if (!padId) {
      setPadURL(undefined);
      return;
    }
    setPadURL(Service.buildPadURL(padId, sessionIds));
  }, [isRTL, hasSession, intl.locale]);

  // The Etherpad toolbar lives inside the (same-origin) iframe, so it can't be styled from the
  // parent stylesheet. On load, inject the Skyroom etherpad stylesheet into the iframe document
  // to reskin the toolbar/icons. Absolute URL is derived from an already-loaded skyroom sheet so
  // it resolves regardless of the client base path. Guarded so a cross-origin pad degrades safely.
  const handleIFrameLoad = useCallback((e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      const doc = e.currentTarget.contentDocument;
      if (!doc || doc.getElementById('skyroom-etherpad-styles')) return;

      const skyroomSheet = Array.from(document.styleSheets)
        .find((s) => s.href && s.href.includes('/stylesheets/skyroom/'));
      const href = skyroomSheet?.href
        ? skyroomSheet.href.replace(/[^/]+$/, 'etherpad.css')
        : null;
      if (!href) return;

      const link = doc.createElement('link');
      link.id = 'skyroom-etherpad-styles';
      link.rel = 'stylesheet';
      link.href = href;
      doc.head.appendChild(link);
    } catch (err) {
      // Cross-origin pad (non-default deployment) — leave the native Etherpad chrome as-is.
    }
  }, []);

  if (!hasPermission) {
    return <PadContent externalId={externalId} />;
  }
  if (!hasSession || !padURL) return null;
  return (
    <Styled.Pad>
      <Styled.IFrame
        title="pad"
        src={padURL}
        aria-describedby="padEscapeHint"
        onLoad={handleIFrameLoad}
        style={{
          pointerEvents: isResizing ? 'none' : 'inherit',
        }}
      />
      <Styled.Hint
        id="padEscapeHint"
        aria-hidden
      >
        {intl.formatMessage(intlMessages.hint)}
      </Styled.Hint>
    </Styled.Pad>
  );
};

const PadContainerGraphql: React.FC<PadContainerGraphqlProps> = (props) => {
  const {
    externalId,
    hasPermission,
    isRTL,
    isResizing,
  } = props;

  const { data: meeting } = useMeeting((m) => ({
    componentsFlags: m.componentsFlags,
  }));
  const { data: padSessionData } = useDeduplicatedSubscription<PadSessionSubscriptionResponse>(
    PAD_SESSION_SUBSCRIPTION,
  );
  const [createSession] = useMutation(CREATE_SESSION);

  const sessionData = padSessionData?.sharedNotes_session ?? [];
  const session = sessionData.find((s) => s.sharedNotesExtId === externalId);
  const hasPad = meeting?.componentsFlags?.hasSharedNotes;
  const hasSession = session?.sessionId !== undefined;
  const sessionIds = new Set<string>(sessionData.map((s) => s.sessionId));

  useEffect(() => {
    if (hasPad && !hasSession && hasPermission) {
      createSession({ variables: { externalId } });
    }
  }, [hasPad, hasSession, hasPermission]);

  return (
    <PadGraphql
      hasSession={hasSession}
      externalId={externalId}
      isRTL={isRTL}
      isResizing={isResizing}
      sessionIds={Array.from(sessionIds)}
      padId={session?.sharedNotes?.padId}
      hasPermission={hasPermission}
    />
  );
};

export default PadContainerGraphql;
