"use client";

import { createContext, useContext } from "react";

export type ChooseLocationContextValue = {
  open: () => void;
  close: () => void;
  isOpen: boolean;
};

export const ChooseLocationContext = createContext<ChooseLocationContextValue | null>(null);

export function useChooseLocationOptional(): ChooseLocationContextValue | null {
  return useContext(ChooseLocationContext);
}

export function useChooseLocation(): ChooseLocationContextValue {
  const ctx = useContext(ChooseLocationContext);
  if (!ctx) {
    throw new Error("useChooseLocation must be used within ChooseLocationProvider");
  }
  return ctx;
}
