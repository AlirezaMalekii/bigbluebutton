import { User } from '/imports/ui/Types/user';
import { UnreadPrivateChatSender } from '/imports/ui/core/hooks/useUnreadPrivateChatsBySender';

export const getPinnedPrivateChatSenderIds = (
  unreadBySender: Map<string, UnreadPrivateChatSender>,
): string[] => Array.from(unreadBySender.entries())
  .sort(([, a], [, b]) => b.lastActivityAt - a.lastActivityAt)
  .map(([userId]) => userId);

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

  if (!currentUser?.userId || pinnedSenderIds.length === 0) {
    return users;
  }

  const pinnedSet = new Set(pinnedSenderIds);
  const userById = new Map<string, User>();

  users.forEach((user) => {
    userById.set(user.userId, user);
  });
  extraPinnedUsers.forEach((user) => {
    userById.set(user.userId, user);
  });

  const pinnedUsers = pinnedSenderIds
    .map((userId) => userById.get(userId))
    .filter((user): user is User => Boolean(user));

  const rest = users.filter(
    (user) => user.userId !== currentUser.userId && !pinnedSet.has(user.userId),
  );

  const currentUserEntry = userById.get(currentUser.userId) ?? currentUser;

  return [currentUserEntry as User, ...pinnedUsers, ...rest];
};

export const reorderSearchUsersForPrivateMessages = (
  users: User[],
  currentUser: User | null | undefined,
  pinnedSenderIds: string[],
): User[] => {
  if (!currentUser?.userId || pinnedSenderIds.length === 0) {
    return users;
  }

  const pinnedSet = new Set(pinnedSenderIds);
  const userById = new Map<string, User>();
  users.forEach((user) => {
    userById.set(user.userId, user);
  });

  const pinnedUsers = pinnedSenderIds
    .map((userId) => userById.get(userId))
    .filter((user): user is User => Boolean(user));

  if (pinnedUsers.length === 0) {
    return users;
  }

  const rest = users.filter(
    (user) => user.userId !== currentUser.userId && !pinnedSet.has(user.userId),
  );

  const currentUserIndex = users.findIndex((user) => user.userId === currentUser.userId);
  const ordered: User[] = [];

  if (currentUserIndex >= 0) {
    ordered.push(users[currentUserIndex]);
  } else if (currentUser.name) {
    ordered.push(currentUser as User);
  }

  ordered.push(...pinnedUsers);

  rest.forEach((user) => {
    if (!ordered.some((entry) => entry.userId === user.userId)) {
      ordered.push(user);
    }
  });

  return ordered.length > 0 ? ordered : users;
};
