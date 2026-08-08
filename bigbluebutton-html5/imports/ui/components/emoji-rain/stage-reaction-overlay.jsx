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
import {
  hasUsableChatBounds,
  resolveChatColumnDomBounds,
} from './resolve-chat-column-bounds';
import { layoutSelectOutput } from '../layout/context';
import Styled from './stage-reaction-overlay-styles';

const MAX_VISIBLE_REACTIONS = 10;
const REACTION_TTL_MS = 7600;
const DUPLICATE_WINDOW_MS = 3000;
/**
 * Above chat panel content; below ActionsBar (20) and BBBMenu (~999).
 */
const CHAT_REACTION_Z_INDEX = 15;

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
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [chatBounds, setChatBounds] = useState(null);
  const seenReactionsRef = useRef(new Set());
  const recentReactionRef = useRef(new Map());
  const expireTimersRef = useRef(new Map());
  const reactionsRef = useRef(reactions);
  reactionsRef.current = reactions;

  const sidebarContent = layoutSelectOutput((i) => i.sidebarContent);
  const sidebarNavigation = layoutSelectOutput((i) => i.sidebarNavigation);

  const Settings = getSettingsSingletonInstance();
  const animations = Settings?.application?.animations;

  const layoutSignal = useMemo(() => ([
    sidebarContent?.display,
    sidebarContent?.width,
    sidebarContent?.height,
    sidebarContent?.top,
    sidebarContent?.left,
    sidebarContent?.right,
    sidebarNavigation?.display,
    sidebarNavigation?.width,
    sidebarNavigation?.height,
    sidebarNavigation?.top,
    sidebarNavigation?.left,
    sidebarNavigation?.right,
  ].join('|')), [
    sidebarContent,
    sidebarNavigation,
  ]);

  useLayoutEffect(() => {
    let frameId = null;
    let resizeObserver = null;
    let observedElement = null;
    let layoutObserver = null;

    const measure = () => {
      const resolved = resolveChatColumnDomBounds();
      const next = resolved?.bounds || null;
      setChatBounds((current) => {
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

    const retryTimers = [100, 350, 800].map((ms) => window.setTimeout(scheduleMeasure, ms));

    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('orientationchange', scheduleMeasure);

    const layoutEl = document.getElementById('layout');
    if (layoutEl && typeof MutationObserver !== 'undefined') {
      layoutObserver = new MutationObserver(scheduleMeasure);
      layoutObserver.observe(layoutEl, {
        attributes: true,
        attributeFilter: [
          'data-skyroom-content-visible',
          'data-skyroom-users-visible',
          'data-skyroom-chat-visible',
          'data-skyroom-mobile',
          'data-skyroom-column',
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

  const boundsVisible = hasUsableChatBounds(chatBounds);

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

      const lane = 18 + Math.random() * 64;
      const drift = Math.round((Math.random() * 40) - 20);
      const duration = Math.round(5200 + Math.random() * 800);

      acc.push({
        id: key,
        emoji: reaction.reaction,
        userName: reaction.userName,
        left: lane,
        drift,
        duration,
        delay: Math.round(Math.random() * 120),
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

  const travel = Math.max(Math.round(Number(chatBounds.height) * 0.68), 100);

  return (
    <Styled.Stage
      style={buildFixedStyle(chatBounds)}
      $zIndex={CHAT_REACTION_Z_INDEX}
      data-test="stageReactionOverlay"
      data-skyroom-chat-reaction-overlay="true"
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
