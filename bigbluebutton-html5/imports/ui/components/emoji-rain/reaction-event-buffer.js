export const getReactionEventKey = (reaction) => {
  const createdAt = reaction.creationDate?.getTime?.() || 0;
  return reaction.eventId
    || `${reaction.userId || 'unknown'}-${reaction.reaction}-${createdAt}`;
};

export const getReactionOwnerKey = (reaction) => (
  reaction.userId
    ? `user:${reaction.userId}`
    : `event:${getReactionEventKey(reaction)}`
);

export const keepLatestReactionPerUser = (reactions) => {
  const latestByOwner = new Map();

  reactions.forEach((reaction) => {
    const ownerKey = getReactionOwnerKey(reaction);
    const previous = latestByOwner.get(ownerKey);
    const createdAt = reaction.creationDate?.getTime?.() || 0;
    const previousCreatedAt = previous?.creationDate?.getTime?.() || 0;

    if (!previous || createdAt >= previousCreatedAt) {
      latestByOwner.set(ownerKey, reaction);
    }
  });

  return [...latestByOwner.values()].sort((first, second) => (
    (first.creationDate?.getTime?.() || 0) - (second.creationDate?.getTime?.() || 0)
  ));
};

export const replaceActiveReactionsByUser = (current, incoming, maxVisible) => {
  const incomingOwners = new Set(incoming.map(getReactionOwnerKey));
  return [
    ...current.filter((reaction) => !incomingOwners.has(getReactionOwnerKey(reaction))),
    ...incoming,
  ].slice(-maxVisible);
};

export default {
  getReactionEventKey,
  getReactionOwnerKey,
  keepLatestReactionPerUser,
  replaceActiveReactionsByUser,
};
