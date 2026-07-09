import React, { useEffect, useRef, useState } from 'react';
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

interface FloatingReaction {
  id: string;
  emoji: string;
  userName: string;
  left: number;
  drift: number;
  duration: number;
  delay: number;
}

const ScreenShareChatReactionOverlay: React.FC = () => {
  const reactions = useReactiveVar(reactionStreamVar);
  const visibility = useReactiveVar(overlayVisibilityVar);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const seenReactionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (visibility === 'hidden') return undefined;

    const now = Date.now();
    const reactionsToShow = reactions.filter(({ reaction, creationDate }) => {
      if (!reaction || reaction === 'none') return false;
      return isFreshReaction(creationDate, now);
    });

    if (reactionsToShow.length === 0) return undefined;

    const nextReactions = reactionsToShow.reduce<FloatingReaction[]>((acc, reaction) => {
      const createdAt = reaction.creationDate.getTime();
      const key = `${reaction.userId || 'unknown'}-${reaction.reaction}-${createdAt}`;

      if (seenReactionsRef.current.has(key)) return acc;
      seenReactionsRef.current.add(key);

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

    if (nextReactions.length === 0) return undefined;

    setFloatingReactions((current) => [
      ...current,
      ...nextReactions,
    ].slice(-MAX_VISIBLE_REACTIONS));

    const timers = nextReactions.map(({ id }) => setTimeout(() => {
      setFloatingReactions((current) => current.filter((reaction) => reaction.id !== id));
    }, REACTION_TTL_MS));

    return () => timers.forEach(clearTimeout);
  }, [reactions, visibility]);

  if (visibility === 'hidden') return null;

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
