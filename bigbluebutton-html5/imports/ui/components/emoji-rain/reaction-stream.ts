import { makeVar } from '@apollo/client';

export interface ReactionStreamItem {
  eventId?: string;
  reaction: string;
  creationDate: Date;
  userId?: string;
  userName: string;
}

interface RawReactionStreamItem {
  reactionEmoji?: string;
  createdAt?: string;
  userId?: string;
  user?: {
    name?: string;
  } | null;
}

/** Default: accept stream events for ~15s so remote clients still animate bubbles. */
const DEFAULT_FRESHNESS_MS = 15000;

export const reactionStreamVar = makeVar<ReactionStreamItem[]>([]);

export const getReactionBubbleFreshnessMs = (): number => {
  const configured = window.meetingClientSettings?.public?.userReaction?.bubbleFreshnessSeconds;
  if (typeof configured === 'number' && configured > 0) {
    return Math.round(configured * 1000);
  }
  return DEFAULT_FRESHNESS_MS;
};

/** Allow a small negative age so server clock slightly ahead of the client
 *  does not drop just-received stream rows for remote viewers. */
const CLOCK_SKEW_TOLERANCE_MS = 3000;

export const isFreshReaction = (
  creationDate: Date,
  now: number = Date.now(),
): boolean => {
  const ageMs = now - creationDate.getTime();
  if (Number.isNaN(ageMs)) return false;
  return ageMs >= -CLOCK_SKEW_TOLERANCE_MS && ageMs <= getReactionBubbleFreshnessMs();
};

export const normalizeReactionStream = (
  reactions: RawReactionStreamItem[] = [],
): ReactionStreamItem[] => reactions.map((reaction) => ({
  eventId: [
    'stream',
    reaction.userId || 'unknown',
    reaction.reactionEmoji || 'none',
    reaction.createdAt || 'unknown',
  ].join('-'),
  reaction: reaction.reactionEmoji || 'none',
  creationDate: new Date(reaction.createdAt || 0),
  userId: reaction.userId,
  userName: reaction.user?.name || '',
}));

export default {
  reactionStreamVar,
  normalizeReactionStream,
  isFreshReaction,
  getReactionBubbleFreshnessMs,
};
