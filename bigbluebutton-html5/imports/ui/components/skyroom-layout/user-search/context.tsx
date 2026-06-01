import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from 'react';

interface SkyroomUserSearchContextValue {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  clearSearch: () => void;
  isSearching: boolean;
}

const SkyroomUserSearchContext = createContext<SkyroomUserSearchContextValue | null>(null);

export const SkyroomUserSearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchTerm, setSearchTermState] = useState('');

  const setSearchTerm = useCallback((value: string) => {
    setSearchTermState(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTermState('');
  }, []);

  const value = useMemo(() => ({
    searchTerm,
    setSearchTerm,
    clearSearch,
    isSearching: searchTerm.trim().length > 0,
  }), [searchTerm, setSearchTerm, clearSearch]);

  return (
    <SkyroomUserSearchContext.Provider value={value}>
      {children}
    </SkyroomUserSearchContext.Provider>
  );
};

export const useSkyroomUserSearch = (): SkyroomUserSearchContextValue => {
  const ctx = useContext(SkyroomUserSearchContext);
  if (!ctx) {
    return {
      searchTerm: '',
      setSearchTerm: () => {},
      clearSearch: () => {},
      isSearching: false,
    };
  }
  return ctx;
};

export default SkyroomUserSearchContext;
