import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { getSettingsSingletonInstance } from '/imports/ui/services/settings';
import { isFreshReaction } from './reaction-stream';
import { layoutSelectOutput } from '../layout/context';
import Styled from './stage-reaction-overlay-styles';

const MAX_VISIBLE_REACTIONS = 10;
const REACTION_TTL_MS = 7600;
const DUPLICATE_WINDOW_MS = 1500;

const hasVisibleBounds = (bounds) => (
  bounds
  && bounds.display !== false
  && Number(bounds.width) > 0
  && Number(bounds.height) > 0
);

const buildBoundsStyle = (bounds) => ({
  top: `${bounds.top || 0}px`,
  left: `${bounds.left || 0}px`,
  width: `${bounds.width || 0}px`,
  height: `${bounds.height || 0}px`,
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
  const seenReactionsRef = useRef(new Set());
  const recentReactionRef = useRef(new Map());
  const expireTimersRef = useRef(new Map());
  const reactionsRef = useRef(reactions);
  reactionsRef.current = reactions;

  const screenShare = layoutSelectOutput((i) => i.screenShare);
  const externalVideo = layoutSelectOutput((i) => i.externalVideo);
  const genericMainContent = layoutSelectOutput((i) => i.genericMainContent);
  const sharedNotes = layoutSelectOutput((i) => i.sharedNotes);
  const presentation = layoutSelectOutput((i) => i.presentation);

  const activeBounds = useMemo(() => {
    const boundsPriority = [
      screenShare,
      externalVideo,
      genericMainContent,
      sharedNotes,
      presentation,
    ];

    return boundsPriority.find(hasVisibleBounds);
  }, [
    screenShare,
    externalVideo,
    genericMainContent,
    sharedNotes,
    presentation,
  ]);

  const boundsVisible = hasVisibleBounds(activeBounds);

  // Stable identity so layout object churn does not re-run reaction intake.
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
      // Keep key in seen set so late re-deliveries of the same stream row
      // do not replay the bubble after it finished animating.
    }, REACTION_TTL_MS);

    expireTimersRef.current.set(id, timer);
  };

  // Drop in-flight bubbles when the stage is hidden so remount does not
  // restart CSS animations for reactions that were already playing.
  useEffect(() => {
    if (boundsVisible) return undefined;

    clearExpireTimers();
    setFloatingReactions([]);
    return undefined;
  }, [boundsVisible]);

  useEffect(() => () => {
    clearExpireTimers();
  }, []);

  useEffect(() => {
    // Do not gate on document.hidden: presenter may be on another display while
    // viewers still need bubbles; stream delivery already handles freshness.
    if (!animations) return;

    const currentReactions = reactionsRef.current;
    const now = Date.now();
    const reactionsToShow = currentReactions.filter(({ reaction, creationDate }) => {
      if (!reaction || reaction === 'none') return false;
      return isFreshReaction(creationDate, now);
    });

    if (reactionsToShow.length === 0) return;

    // While the stage is hidden, consume fresh events without animating so a
    // later show/file-change does not dump a backlog of "new" bubbles.
    if (!boundsVisible) {
      reactionsToShow.forEach((reaction) => {
        const createdAt = reaction.creationDate.getTime();
        const key = getReactionKey(reaction);
        const duplicateKey = `${reaction.userId || 'unknown'}-${reaction.reaction}`;
        seenReactionsRef.current.add(key);
        recentReactionRef.current.set(duplicateKey, createdAt);
      });
      return;
    }

    const nextReactions = reactionsToShow.reduce((acc, reaction) => {
      const createdAt = reaction.creationDate.getTime();
      const key = getReactionKey(reaction);
      const duplicateKey = `${reaction.userId || 'unknown'}-${reaction.reaction}`;
      const lastSeenAt = recentReactionRef.current.get(duplicateKey) || 0;

      if (seenReactionsRef.current.has(key)) return acc;
      if (createdAt - lastSeenAt >= 0 && createdAt - lastSeenAt < DUPLICATE_WINDOW_MS) return acc;

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

  const travel = Math.max(Number(activeBounds.height) - 24, 120);
  const zIndex = Math.max(Number(activeBounds.zIndex || 0) + 4, 8);

  return (
    <Styled.Stage
      style={buildBoundsStyle(activeBounds)}
      $zIndex={zIndex}
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
