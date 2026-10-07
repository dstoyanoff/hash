import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface DetailState {
  id: string;
  header: ReactNode;
  body: ReactNode;
  expanded: boolean;

  /** Stays at full size: the drawer has no button to collapse it. */
  locked: boolean;
}

interface DetailContextValue {
  detail: DetailState | null;

  /** `expanded` opens it at full size instead of the side panel; `locked` keeps it there, with no button to collapse it. */
  openDetail: (
    id: string,
    header: ReactNode,
    body: ReactNode,
    expanded?: boolean,
    locked?: boolean,
  ) => void;

  /** Keeps an already-open drawer's content live; a no-op for any other `id`. */
  updateDetail: (id: string, header: ReactNode, body: ReactNode) => void;
  closeDetail: () => void;
  toggleExpanded: () => void;
}

const DetailContext = createContext<DetailContextValue | null>(null);

/** Backs the single shared `EntityDrawer`; instantiated once by `HashsomeProvider`. */
export function DetailProvider({ children }: { children: ReactNode }) {
  const [detail, setDetail] = useState<DetailState | null>(null);

  const openDetail = useCallback(
    (id: string, header: ReactNode, body: ReactNode, expanded = false, locked = false) => {
      setDetail({ id, header, body, expanded: expanded || locked, locked });
    },
    [],
  );

  const updateDetail = useCallback((id: string, header: ReactNode, body: ReactNode) => {
    setDetail((current) => (current && current.id === id ? { ...current, header, body } : current));
  }, []);

  const closeDetail = useCallback(() => setDetail(null), []);
  const toggleExpanded = useCallback(() => {
    setDetail((current) => (current ? { ...current, expanded: !current.expanded } : current));
  }, []);

  const value = useMemo<DetailContextValue>(
    () => ({ detail, openDetail, updateDetail, closeDetail, toggleExpanded }),
    [detail, openDetail, updateDetail, closeDetail, toggleExpanded],
  );

  return <DetailContext.Provider value={value}>{children}</DetailContext.Provider>;
}

export function useDetail(): DetailContextValue {
  const context = useContext(DetailContext);
  if (!context) {
    throw new Error('useDetail must be used inside <DetailProvider>');
  }

  return context;
}
