import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';
import EmojiRain from './component';
import StageReactionOverlay from './stage-reaction-overlay';
import { getEmojisToRain, getUserReactionsForStage } from './queries';
import {
  isFreshReaction,
  normalizeReactionStream,
  reactionStreamVar,
} from './reaction-stream';
import useDeduplicatedSubscription from '../../core/hooks/useDeduplicatedSubscription';

const DUPLICATE_WINDOW_MS = 1500;
const MAX_FALLBACK_REACTIONS = 20;
const EMPTY_STREAM = [];

const getReactionDedupKey = (reaction) => {
  if (reaction.eventId) return reaction.eventId;
  const createdAt = reaction.creationDate?.getTime?.() || 0;
  const bucket = Math.floor(createdAt / DUPLICATE_WINDOW_MS);
  return `${reaction.userId || 'unknown'}-${reaction.reaction}-${bucket}`;
};

const dedupeReactions = (reactions) => {
  const seen = new Set();
  const result = [];

  reactions.forEach((reaction) => {
    const key = getReactionDedupKey(reaction);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(reaction);
  });

  return result;
};

const EmojiRainContainer = () => {
  const nowDate = useRef(new Date().toISOString());
  const previousUserReactionsRef = useRef(new Map());
  const [fallbackReactions, setFallbackReactions] = useState([]);

  const {
    data: emojisToRainData,
  } = useDeduplicatedSubscription(getEmojisToRain, {
    variables: {
      initialCursor: nowDate.current,
    },
  });
  const emojisArray = emojisToRainData?.user_reaction_stream ?? EMPTY_STREAM;

  const {
    data: usersReactionData,
  } = useDeduplicatedSubscription(getUserReactionsForStage);

  useEffect(() => {
    const users = usersReactionData?.user || [];
    if (users.length === 0) return;

    const previous = previousUserReactionsRef.current;
    const next = new Map();
    const nextFallbackReactions = [];

    users.forEach((user) => {
      const reaction = user.reactionEmoji || 'none';
      next.set(user.userId, reaction);

      const previousReaction = previous.get(user.userId);
      const isInitialLoad = previousReaction === undefined;

      if (isInitialLoad || reaction === 'none' || reaction === previousReaction) return;

      nextFallbackReactions.push({
        eventId: [
          'user-state',
          user.userId,
          reaction,
          Date.now(),
        ].join('-'),
        reaction,
        creationDate: new Date(),
        userId: user.userId,
        userName: user.name || '',
      });
    });

    previousUserReactionsRef.current = next;

    if (nextFallbackReactions.length > 0) {
      setFallbackReactions((current) => {
        const now = Date.now();
        return dedupeReactions([
          ...current.filter((reaction) => isFreshReaction(reaction.creationDate, now)),
          ...nextFallbackReactions,
        ]).slice(-MAX_FALLBACK_REACTIONS);
      });
    }
  }, [usersReactionData]);

  // Keep stream + fallback items; overlays apply freshness when animating.
  // Avoid filtering here so slight server/client clock skew cannot drop live
  // reactions before remote viewers receive them.
  const reactions = useMemo(() => dedupeReactions([
    ...normalizeReactionStream(emojisArray),
    ...fallbackReactions,
  ]), [emojisArray, fallbackReactions]);

  useEffect(() => {
    reactionStreamVar(reactions);
  }, [reactions]);

  return (
    <>
      <EmojiRain reactions={reactions} />
      <StageReactionOverlay reactions={reactions} />
    </>
  );
};

export default EmojiRainContainer;
