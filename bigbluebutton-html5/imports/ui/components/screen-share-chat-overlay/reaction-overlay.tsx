import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { useReactiveVar } from '@apollo/client';
import {
  isFreshReaction,
  reactionStreamVar,
} from '/imports/ui/components/emoji-rain/reaction-stream';
import { overlayVisibilityVar } from './service';
import {
  OverlayReactionBubble,
  OverlayReactionCard,
  OverlayReactionEmoji,
  OverlayReactionLayer,
  OverlayReactionName,
} from './styles';

const MAX_VISIBLE_REACTIONS = 6;
const REACTION_TTL_MS = 6800;
const DUPLICATE_WINDOW_MS = 1500;

interface FloatingReaction {
  id: string;
  emoji: string;
  userName: string;
  left: number;
  drift: number;
  duration: number;
  delay: number;
}

const getReactionKey = (reaction: {
  eventId?: string;
  userId?: string;
  reaction: string;
  creationDate: Date;
}) => {
  const createdAt = reaction.creationDate?.getTime?.() || 0;
  return reaction.eventId
    || `${reaction.userId || 'unknown'}-${reaction.reaction}-${createdAt}`;
};

const ScreenShareChatReactionOverlay: React.FC = () => {
  const reactions = useReactiveVar(reactionStreamVar);
  const visibility = useReactiveVar(overlayVisibilityVar);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const seenReactionsRef = useRef<Set<string>>(new Set());
  const recentReactionRef = useRef<Map<string, number>>(new Map());
  const expireTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const reactionsRef = useRef(reactions);
  reactionsRef.current = reactions;

  const overlayVisible = visibility !== 'hidden';

  const reactionSignature = useMemo(
    () => reactions.map(getReactionKey).join('|'),
    [reactions],
  );

  const clearExpireTimers = () => {
    expireTimersRef.current.forEach((timer) => clearTimeout(timer));
    expireTimersRef.current.clear();
  };

  const scheduleExpire = (id: string) => {
    if (expireTimersRef.current.has(id)) return;

    const timer = setTimeout(() => {
      setFloatingReactions((current) => current.filter((reaction) => reaction.id !== id));
      expireTimersRef.current.delete(id);
    }, REACTION_TTL_MS);

    expireTimersRef.current.set(id, timer);
  };

  useEffect(() => {
    if (overlayVisible) return undefined;

    clearExpireTimers();
    setFloatingReactions([]);
    return undefined;
  }, [overlayVisible]);

  useEffect(() => () => {
    clearExpireTimers();
  }, []);

  useEffect(() => {
    const currentReactions = reactionsRef.current;

    if (!overlayVisible) {
      const now = Date.now();
      currentReactions.forEach((reaction) => {
        if (!reaction.reaction || reaction.reaction === 'none') return;
        if (!isFreshReaction(reaction.creationDate, now)) return;

        const createdAt = reaction.creationDate.getTime();
        const key = getReactionKey(reaction);
        const duplicateKey = `${reaction.userId || 'unknown'}-${reaction.reaction}`;
        seenReactionsRef.current.add(key);
        recentReactionRef.current.set(duplicateKey, createdAt);
      });
      return;
    }

    const now = Date.now();
    const reactionsToShow = currentReactions.filter(({ reaction, creationDate }) => {
      if (!reaction || reaction === 'none') return false;
      return isFreshReaction(creationDate, now);
    });

    if (reactionsToShow.length === 0) return;

    const nextReactions = reactionsToShow.reduce<FloatingReaction[]>((acc, reaction) => {
      const createdAt = reaction.creationDate.getTime();
      const key = getReactionKey(reaction);
      const duplicateKey = `${reaction.userId || 'unknown'}-${reaction.reaction}`;
      const lastSeenAt = recentReactionRef.current.get(duplicateKey) || 0;

      if (seenReactionsRef.current.has(key)) return acc;
      if (createdAt - lastSeenAt >= 0 && createdAt - lastSeenAt < DUPLICATE_WINDOW_MS) return acc;

      seenReactionsRef.current.add(key);
      recentReactionRef.current.set(duplicateKey, createdAt);

      acc.push({
        id: key,
        emoji: reaction.reaction,
        userName: reaction.userName,
        left: 14 + Math.random() * 72,
        drift: Math.round((Math.random() * 44) - 22),
        duration: Math.round(5600 + Math.random() * 800),
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
  }, [overlayVisible, reactionSignature]);

  if (!overlayVisible) return null;

  return (
    <OverlayReactionLayer data-test="screenShareChatReactionOverlay">
      {floatingReactions.map((reaction) => (
        <OverlayReactionBubble
          key={reaction.id}
          $left={reaction.left}
          $drift={reaction.drift}
          $duration={reaction.duration}
          $delay={reaction.delay}
        >
          <OverlayReactionCard>
            <OverlayReactionEmoji aria-hidden="true">
              {reaction.emoji}
            </OverlayReactionEmoji>
            {reaction.userName ? (
              <OverlayReactionName dir="auto" title={reaction.userName}>
                {reaction.userName}
              </OverlayReactionName>
            ) : null}
          </OverlayReactionCard>
        </OverlayReactionBubble>
      ))}
    </OverlayReactionLayer>
  );
};

export default ScreenShareChatReactionOverlay;
