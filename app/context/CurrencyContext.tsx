"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CurrencyCode = "IDR" | "USD" | "AUD";

type CurrencyContextType = {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const STORAGE_KEY = "tetamo_currency";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("IDR");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "IDR" || stored === "USD" || stored === "AUD") {
      setCurrencyState(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const value = useMemo(
    () => ({
      currency,
      setCurrency: setCurrencyState,
    }),
    [currency]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);

  if (!ctx) {
    throw new Error("useCurrency must be used inside CurrencyProvider");
  }

  return ctx;
}