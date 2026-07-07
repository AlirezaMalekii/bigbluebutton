import { useMemo } from 'react';

const useHiddenTabUserIds = (): Set<string> => {
  // Hidden-tab filtering is disabled until production Hasura exposes clientIsHidden.
  return useMemo(() => new Set<string>(), []);
};

export default useHiddenTabUserIds;
