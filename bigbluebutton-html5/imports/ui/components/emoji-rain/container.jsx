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

const getUserEmojiKey = (reaction) => (
  `${reaction.userId || 'unknown'}-${reaction.reaction || 'none'}`
);

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

/**
 * Stream rows and user-state fallback use different eventIds for the same
 * send. Collapse same user+emoji within a short window, preferring stream.
 */
const mergeStreamAndFallback = (streamReactions, fallbackReactions) => {
  const merged = [];
  const recentByUserEmoji = new Map();

  const pushUnique = (reaction) => {
    if (!reaction?.reaction || reaction.reaction === 'none') return;

    const userEmojiKey = getUserEmojiKey(reaction);
    const createdAt = reaction.creationDate?.getTime?.() || 0;
    const lastSeenAt = recentByUserEmoji.get(userEmojiKey);

    if (
      lastSeenAt != null
      && Math.abs(createdAt - lastSeenAt) < DUPLICATE_WINDOW_MS
    ) {
      return;
    }

    const eventKey = getReactionDedupKey(reaction);
    if (merged.some((item) => getReactionDedupKey(item) === eventKey)) return;

    recentByUserEmoji.set(userEmojiKey, createdAt);
    merged.push(reaction);
  };

  // Prefer canonical stream events first, then fill gaps via fallback.
  dedupeReactions(streamReactions).forEach(pushUnique);
  dedupeReactions(fallbackReactions).forEach(pushUnique);

  return merged;
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

  const reactions = useMemo(() => mergeStreamAndFallback(
    normalizeReactionStream(emojisArray),
    fallbackReactions,
  ), [emojisArray, fallbackReactions]);

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
