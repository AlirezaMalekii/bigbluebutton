import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { getSettingsSingletonInstance } from '/imports/ui/services/settings';
import { isFreshReaction } from './reaction-stream';
import { hasUsableStageBounds, resolveStageDomBounds } from './resolve-stage-bounds';
import { layoutSelectOutput } from '../layout/context';
import Styled from './stage-reaction-overlay-styles';

const MAX_VISIBLE_REACTIONS = 10;
const REACTION_TTL_MS = 7600;
const DUPLICATE_WINDOW_MS = 1500;
/**
 * Default: above stage media (6) and webcam strip (8–9), below ActionsBar (20)
 * and BBBMenu (~999) so the footer reaction picker stays clickable.
 * Webcam-fullscreen bump lives in skyroom CSS (above ~1502).
 */
const STAGE_REACTION_Z_INDEX = 15;

const buildFixedStyle = (bounds) => ({
  top: `${bounds.top}px`,
  left: `${bounds.left}px`,
  width: `${bounds.width}px`,
  height: `${bounds.height}px`,
});

const getReactionKey = (reaction) => {
  const createdAt = reaction.creationDate?.getTime?.() || 0;
  return reaction.eventId
    || `${reaction.userId || 'unknown'}-${reaction.reaction}-${createdAt}`;
};

const StageReactionOverlay = ({ reactions }) => {
  const Settings = getSettingsSingletonInstance();
  const { animations } = Settings.application;
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [stageBounds, setStageBounds] = useState(null);
  const seenReactionsRef = useRef(new Set());
  const recentReactionRef = useRef(new Map());
  const expireTimersRef = useRef(new Map());
  const reactionsRef = useRef(reactions);
  reactionsRef.current = reactions;

  // Layout output changes are a signal to re-measure the painted stage DOM.
  const screenShare = layoutSelectOutput((i) => i.screenShare);
  const externalVideo = layoutSelectOutput((i) => i.externalVideo);
  const genericMainContent = layoutSelectOutput((i) => i.genericMainContent);
  const sharedNotes = layoutSelectOutput((i) => i.sharedNotes);
  const presentation = layoutSelectOutput((i) => i.presentation);

  const layoutSignal = useMemo(() => ([
    screenShare?.display,
    screenShare?.width,
    screenShare?.height,
    screenShare?.top,
    screenShare?.left,
    externalVideo?.display,
    externalVideo?.width,
    externalVideo?.height,
    externalVideo?.top,
    externalVideo?.left,
    genericMainContent?.width,
    genericMainContent?.height,
    sharedNotes?.width,
    sharedNotes?.height,
    presentation?.display,
    presentation?.width,
    presentation?.height,
    presentation?.top,
    presentation?.left,
    presentation?.right,
  ].join('|')), [
    screenShare,
    externalVideo,
    genericMainContent,
    sharedNotes,
    presentation,
  ]);

  useLayoutEffect(() => {
    let frameId = null;
    let resizeObserver = null;
    let observedElement = null;
    let layoutObserver = null;

    const measure = () => {
      const resolved = resolveStageDomBounds();
      const next = resolved?.bounds || null;
      setStageBounds((current) => {
        if (!next && !current) return current;
        if (!next) return null;
        if (
          current
          && current.top === next.top
          && current.left === next.left
          && current.width === next.width
          && current.height === next.height
        ) {
          return current;
        }
        return next;
      });

      if (resolved?.element && resolved.element !== observedElement) {
        if (resizeObserver && observedElement) {
          resizeObserver.unobserve(observedElement);
        }
        observedElement = resolved.element;
        if (resizeObserver) {
          resizeObserver.observe(observedElement);
        }
      }
    };

    const scheduleMeasure = () => {
      if (frameId != null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        measure();
      });
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      if (observedElement) {
        resizeObserver.observe(observedElement);
      }
    }

    // Whiteboard/tldraw can mount slightly after layout output updates.
    const retryTimers = [100, 350, 800].map((ms) => window.setTimeout(scheduleMeasure, ms));

    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('orientationchange', scheduleMeasure);

    // Presentation minimize / webcam fullscreen swap stage targets without
    // always changing layout output dimensions.
    const layoutEl = document.getElementById('layout');
    if (layoutEl && typeof MutationObserver !== 'undefined') {
      layoutObserver = new MutationObserver(scheduleMeasure);
      layoutObserver.observe(layoutEl, {
        attributes: true,
        attributeFilter: [
          'data-skyroom-presentation-minimized',
          'data-skyroom-webcam-fullscreen',
          'data-skyroom-stage-webcams',
          'data-skyroom-stage-full',
          'data-skyroom-screen-share',
        ],
      });
    }

    return () => {
      if (frameId != null) window.cancelAnimationFrame(frameId);
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
      if (resizeObserver) resizeObserver.disconnect();
      if (layoutObserver) layoutObserver.disconnect();
    };
  }, [layoutSignal]);

  const boundsVisible = hasUsableStageBounds(stageBounds);

  const reactionSignature = useMemo(
    () => reactions.map(getReactionKey).join('|'),
    [reactions],
  );

  const clearExpireTimers = () => {
    expireTimersRef.current.forEach((timer) => clearTimeout(timer));
    expireTimersRef.current.clear();
  };

  const scheduleExpire = (id) => {
    if (expireTimersRef.current.has(id)) return;

    const timer = setTimeout(() => {
      setFloatingReactions((current) => current.filter((reaction) => reaction.id !== id));
      expireTimersRef.current.delete(id);
    }, REACTION_TTL_MS);

    expireTimersRef.current.set(id, timer);
  };

  useEffect(() => () => {
    clearExpireTimers();
  }, []);

  useEffect(() => {
    if (!animations || !boundsVisible) return;

    const currentReactions = reactionsRef.current;
    const now = Date.now();
    const reactionsToShow = currentReactions.filter(({ reaction, creationDate }) => {
      if (!reaction || reaction === 'none') return false;
      return isFreshReaction(creationDate, now);
    });

    if (reactionsToShow.length === 0) return;

    const nextReactions = reactionsToShow.reduce((acc, reaction) => {
      const createdAt = reaction.creationDate.getTime();
      const key = getReactionKey(reaction);
      const duplicateKey = `${reaction.userId || 'unknown'}-${reaction.reaction}`;
      const lastSeenAt = recentReactionRef.current.get(duplicateKey);

      if (seenReactionsRef.current.has(key)) return acc;
      if (
        lastSeenAt != null
        && Math.abs(createdAt - lastSeenAt) < DUPLICATE_WINDOW_MS
      ) {
        return acc;
      }

      seenReactionsRef.current.add(key);
      recentReactionRef.current.set(duplicateKey, createdAt);

      const lane = 12 + Math.random() * 76;
      const drift = Math.round((Math.random() * 72) - 36);
      const duration = Math.round(6200 + Math.random() * 900);

      acc.push({
        id: key,
        emoji: reaction.reaction,
        userName: reaction.userName,
        left: lane,
        drift,
        duration,
        delay: Math.round(Math.random() * 180),
      });

      return acc;
    }, []);

    if (nextReactions.length === 0) return;

    setFloatingReactions((current) => [
      ...current,
      ...nextReactions,
    ].slice(-MAX_VISIBLE_REACTIONS));

    nextReactions.forEach(({ id }) => scheduleExpire(id));
  }, [animations, boundsVisible, reactionSignature]);

  if (!animations || !boundsVisible) return null;

  // Keep rise distance proportional to the painted stage so video/pdf/whiteboard
  // share the same perceived speed (fixed duration × relative travel).
  const travel = Math.max(Math.round(Number(stageBounds.height) * 0.72), 160);

  return (
    <Styled.Stage
      style={buildFixedStyle(stageBounds)}
      $zIndex={STAGE_REACTION_Z_INDEX}
      data-test="stageReactionOverlay"
    >
      {floatingReactions.map((reaction) => (
        <Styled.Bubble
          key={reaction.id}
          $left={reaction.left}
          $drift={reaction.drift}
          $duration={reaction.duration}
          $delay={reaction.delay}
          $travel={travel}
        >
          <Styled.BubbleCard>
            <Styled.Emoji aria-hidden="true">{reaction.emoji}</Styled.Emoji>
            {reaction.userName
              ? (
                <Styled.Name dir="auto" title={reaction.userName}>
                  {reaction.userName}
                </Styled.Name>
              )
              : null}
          </Styled.BubbleCard>
        </Styled.Bubble>
      ))}
    </Styled.Stage>
  );
};

StageReactionOverlay.propTypes = {
  reactions: PropTypes.arrayOf(PropTypes.shape({
    eventId: PropTypes.string,
    reaction: PropTypes.string.isRequired,
    creationDate: PropTypes.instanceOf(Date).isRequired,
    userId: PropTypes.string,
    userName: PropTypes.string,
  })).isRequired,
};

export default StageReactionOverlay;
