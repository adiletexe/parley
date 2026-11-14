import {createContext, useCallback, useContext, useEffect, useState, type ReactNode} from 'react';
import type {Me} from '../../shared/types';
import {api} from './api';

interface MeCtx { me: Me | null; refresh: () => Promise<Me | null> }
const Ctx = createContext<MeCtx>({me: null, refresh: async () => null});

export function MeProvider({children}: {children: ReactNode}) {
  const [me, setMe] = useState<Me | null>(null);
  const refresh = useCallback(async () => {
    try { const m = await api<Me>('/api/me'); setMe(m); return m; } catch { return null; }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return <Ctx.Provider value={{me, refresh}}>{children}</Ctx.Provider>;
}

export const useMe = () => useContext(Ctx);
