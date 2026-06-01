import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

interface SkyroomChatMessageFilterContextValue {
  filterTerm: string;
  setFilterTerm: (value: string) => void;
  clearFilter: () => void;
  isFiltering: boolean;
}

const SkyroomChatMessageFilterContext = createContext<SkyroomChatMessageFilterContextValue | null>(null);

export const SkyroomChatMessageFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filterTerm, setFilterTermState] = useState('');

  const setFilterTerm = useCallback((value: string) => {
    setFilterTermState(value);
  }, []);

  const clearFilter = useCallback(() => {
    setFilterTermState('');
  }, []);

  const value = useMemo(() => ({
    filterTerm,
    setFilterTerm,
    clearFilter,
    isFiltering: filterTerm.trim().length > 0,
  }), [filterTerm, setFilterTerm, clearFilter]);

  return (
    <SkyroomChatMessageFilterContext.Provider value={value}>
      {children}
    </SkyroomChatMessageFilterContext.Provider>
  );
};

export const useSkyroomChatMessageFilter = (): SkyroomChatMessageFilterContextValue => {
  const ctx = useContext(SkyroomChatMessageFilterContext);
  if (!ctx) {
    return {
      filterTerm: '',
      setFilterTerm: () => {},
      clearFilter: () => {},
      isFiltering: false,
    };
  }
  return ctx;
};

export default SkyroomChatMessageFilterContext;
