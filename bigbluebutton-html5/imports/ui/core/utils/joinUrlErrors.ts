export interface JoinUrlError {
  key: string;
  message: string;
}

export const parseJoinUrlErrors = (): JoinUrlError[] => {
  const raw = new URLSearchParams(window.location.search).get('errors');
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is JoinUrlError => (
        item != null
        && typeof item === 'object'
        && typeof item.key === 'string'
        && typeof item.message === 'string'
      ));
  } catch {
    return [];
  }
};

export const clearJoinUrlErrorsFromUrl = (): void => {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('errors')) return;

  url.searchParams.delete('errors');
  const nextSearch = url.searchParams.toString();
  const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
  window.history.replaceState({}, '', nextUrl);
};
