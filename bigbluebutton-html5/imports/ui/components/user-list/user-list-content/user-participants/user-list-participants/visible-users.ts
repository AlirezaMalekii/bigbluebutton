import type { User } from '/imports/ui/Types/user';

type Pages = Record<number, User[]>;

export const updateVisibleUserPage = (pages: Pages, index: number, users: User[]): Pages => {
  const previous = pages[index];
  if (previous?.length === users.length
    && previous.every((user, position) => user === users[position])) return pages;
  return { ...pages, [index]: users };
};

export const removeVisibleUserPage = (pages: Pages, index: number): Pages => {
  if (!(index in pages)) return pages;
  const next = { ...pages };
  delete next[index];
  return next;
};
