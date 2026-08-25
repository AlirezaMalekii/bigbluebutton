import { User } from '/imports/ui/Types/user';
import { UnreadPrivateChatSender } from '/imports/ui/core/hooks/useUnreadPrivateChatsBySender';

export const getPinnedPrivateChatSenderIds = (
  unreadBySender: Map<string, UnreadPrivateChatSender>,
): string[] => Array.from(unreadBySender.entries())
  .sort(([, a], [, b]) => b.lastActivityAt - a.lastActivityAt)
  .map(([userId]) => userId);

const sortRaisedHandsFifo = (a: User, b: User): number => {
  const aTime = a.raiseHandTime ? Date.parse(a.raiseHandTime) : Number.MAX_SAFE_INTEGER;
  const bTime = b.raiseHandTime ? Date.parse(b.raiseHandTime) : Number.MAX_SAFE_INTEGER;
  if (aTime < bTime) return -1;
  if (aTime > bTime) return 1;
  return 0;
};

/**
 * Raised-hand FIFO stays above private-chat pinning so the speak queue
 * is not buried under unread DMs or "current user first".
 */
export const reorderUsersForPrivateMessages = (
  users: User[],
  currentUser: User | null | undefined,
  extraPinnedUsers: User[],
  offset: number,
  pinnedSenderIds: string[],
): User[] => {
  if (offset !== 0) {
    const pinnedSet = new Set(pinnedSenderIds);
    return users.filter((user) => !pinnedSet.has(user.userId));
  }

  const raisedHands = users
    .filter((user) => user.raiseHand)
    .slice()
    .sort(sortRaisedHandsFifo);
  const raisedHandIds = new Set(raisedHands.map((user) => user.userId));

  const nonRaisedUsers = users.filter((user) => !raisedHandIds.has(user.userId));
  const nonRaisedExtraPinned = extraPinnedUsers.filter(
    (user) => !raisedHandIds.has(user.userId) && !user.raiseHand,
  );

  if (!currentUser?.userId || pinnedSenderIds.length === 0) {
    return raisedHands.length > 0 ? [...raisedHands, ...nonRaisedUsers] : users;
  }

  const pinnedSet = new Set(pinnedSenderIds);
  const userById = new Map<string, User>();

  nonRaisedUsers.forEach((user) => {
    userById.set(user.userId, user);
  });
  nonRaisedExtraPinned.forEach((user) => {
    userById.set(user.userId, user);
  });

  const pinnedUsers = pinnedSenderIds
    .map((userId) => userById.get(userId))
    .filter((user): user is User => {
      if (!user) return false;
      return !raisedHandIds.has(user.userId);
    });

  const currentUserInRaisedQueue = raisedHandIds.has(currentUser.userId);
  const rest = nonRaisedUsers.filter(
    (user) => (currentUserInRaisedQueue || user.userId !== currentUser.userId)
      && !pinnedSet.has(user.userId),
  );

  const reorderedNonRaised: User[] = [];
  if (!currentUserInRaisedQueue) {
    const currentUserEntry = userById.get(currentUser.userId) ?? currentUser;
    reorderedNonRaised.push(currentUserEntry as User);
  }
  reorderedNonRaised.push(...pinnedUsers, ...rest);

  return [...raisedHands, ...reorderedNonRaised];
};

export const reorderSearchUsersForPrivateMessages = (
  users: User[],
  currentUser: User | null | undefined,
  pinnedSenderIds: string[],
): User[] => {
  const raisedHands = users
    .filter((user) => user.raiseHand)
    .slice()
    .sort(sortRaisedHandsFifo);
  const raisedHandIds = new Set(raisedHands.map((user) => user.userId));
  const nonRaisedUsers = users.filter((user) => !raisedHandIds.has(user.userId));

  if (!currentUser?.userId || pinnedSenderIds.length === 0) {
    return raisedHands.length > 0 ? [...raisedHands, ...nonRaisedUsers] : users;
  }

  const pinnedSet = new Set(pinnedSenderIds);
  const userById = new Map<string, User>();
  nonRaisedUsers.forEach((user) => {
    userById.set(user.userId, user);
  });

  const pinnedUsers = pinnedSenderIds
    .map((userId) => userById.get(userId))
    .filter((user): user is User => Boolean(user));

  if (pinnedUsers.length === 0) {
    return raisedHands.length > 0 ? [...raisedHands, ...nonRaisedUsers] : users;
  }

  const currentUserInRaisedQueue = raisedHandIds.has(currentUser.userId);
  const rest = nonRaisedUsers.filter(
    (user) => (currentUserInRaisedQueue || user.userId !== currentUser.userId)
      && !pinnedSet.has(user.userId),
  );

  const reorderedNonRaised: User[] = [];
  if (!currentUserInRaisedQueue) {
    const currentUserIndex = nonRaisedUsers.findIndex(
      (user) => user.userId === currentUser.userId,
    );
    if (currentUserIndex >= 0) {
      reorderedNonRaised.push(nonRaisedUsers[currentUserIndex]);
    } else if (currentUser.name) {
      reorderedNonRaised.push(currentUser as User);
    }
  }

  reorderedNonRaised.push(...pinnedUsers);
  rest.forEach((user) => {
    if (!reorderedNonRaised.some((entry) => entry.userId === user.userId)) {
      reorderedNonRaised.push(user);
    }
  });

  return [...raisedHands, ...reorderedNonRaised];
};
