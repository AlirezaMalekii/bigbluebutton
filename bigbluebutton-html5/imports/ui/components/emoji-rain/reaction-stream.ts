import { makeVar } from '@apollo/client';

export interface ReactionStreamItem {
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

export const reactionStreamVar = makeVar<ReactionStreamItem[]>([]);

export const normalizeReactionStream = (
  reactions: RawReactionStreamItem[] = [],
): ReactionStreamItem[] => reactions.map((reaction) => ({
  reaction: reaction.reactionEmoji || 'none',
  creationDate: new Date(reaction.createdAt || 0),
  userId: reaction.userId,
  userName: reaction.user?.name || '',
}));

export default {
  reactionStreamVar,
  normalizeReactionStream,
};
