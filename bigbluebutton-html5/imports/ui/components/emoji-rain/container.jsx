import React, { useEffect, useRef, useState } from 'react';
import EmojiRain from './component';
import StageReactionOverlay from './stage-reaction-overlay';
import { getEmojisToRain, getUserReactionsForStage } from './queries';
import { normalizeReactionStream, reactionStreamVar } from './reaction-stream';
import useDeduplicatedSubscription from '../../core/hooks/useDeduplicatedSubscription';

const DUPLICATE_WINDOW_MS = 1500;

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
  const emojisArray = emojisToRainData?.user_reaction_stream || [];

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
      setFallbackReactions((current) => dedupeReactions([
        ...current,
        ...nextFallbackReactions,
      ]).slice(-20));
    }
  }, [usersReactionData]);

  const reactions = dedupeReactions([
    ...normalizeReactionStream(emojisArray),
    ...fallbackReactions,
  ]);

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
