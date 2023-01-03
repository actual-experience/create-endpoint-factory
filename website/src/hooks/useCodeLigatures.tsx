import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import { useCallback, useEffect } from 'react';
import React, { useMemo } from 'react';
import { createContext, ReactNode, useContext, useState } from 'react';
import { createStorageSlot } from '@site/src/util/storageUtils';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

type ContextValue = {
  /** Current ligature setting */
  readonly ligature: Ligature;
  /** Set new ligature setting. */
  readonly setLigature: (ligature: Ligature) => void;
};

const Context = createContext<ContextValue | undefined>(undefined);

const LigatureStorageKey = 'ligatures';
const LigatureStorage = createStorageSlot(LigatureStorageKey);

const Ligatutures = {
  normal: 'normal',
  none: 'none',
} as const;

type Ligature = typeof Ligatutures[keyof typeof Ligatutures];

const coerceToLigature = (ligature?: string | null): Ligature =>
  ligature === Ligatutures.normal ? Ligatutures.normal : Ligatutures.none;

const getInitialLigature = (defaultMode: Ligature | undefined): Ligature =>
  ExecutionEnvironment.canUseDOM
    ? coerceToLigature(document.documentElement.getAttribute('data-ligatures'))
    : coerceToLigature(defaultMode);

const storeLigature = (newLigature: Ligature) => {
  LigatureStorage.set(coerceToLigature(newLigature));
};

const useContextValue = (): ContextValue => {
  const {
    siteConfig: { customFields = {} },
  } = useDocusaurusContext();
  const [ligature, setLigatureState] = useState(
    getInitialLigature(coerceToLigature(`${customFields.defaultLigatures}`))
  );
  const setLigature = useCallback(
    (newLigature: Ligature | null, options: { persist?: boolean } = {}) => {
      const { persist = true } = options;
      if (newLigature) {
        setLigatureState(newLigature);
        if (persist) {
          storeLigature(newLigature);
        }
      } else {
        setLigatureState(Ligatutures.none);
        LigatureStorage.del();
      }
    },
    []
  );

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-ligatures',
      coerceToLigature(ligature)
    );
  }, [ligature]);

  useEffect(() => {
    const onChange = (e: StorageEvent) => {
      if (e.key !== LigatureStorageKey) {
        return;
      }
      const storedLigature = LigatureStorage.get();
      if (storedLigature !== null) {
        setLigature(coerceToLigature(storedLigature), { persist: false });
      }
    };
    window.addEventListener('storage', onChange);
    return () => window.removeEventListener('storage', onChange);
  }, [setLigature]);

  return useMemo(() => ({ ligature, setLigature }), [ligature, setLigature]);
};

export const LigatureProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const value = useContextValue();
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useLigature = (): ContextValue => {
  const context = useContext(Context);
  if (context == null) {
    throw new Error('useLigature used outside of a LigatureProvider');
  }
  return context;
};
