"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export type ProductSearchHit = {
  id: string;
  slug: string | null;
  storeSlug?: string | null;
  name: string;
  price: number;
  imageUrl?: string | null;
};

type Options = {
  /** Если false — запросы подсказок не выполняются. */
  suggestEnabled?: boolean;
  /** Минимум символов в запросе до запроса к API (главная: 1, каталог: 2). */
  minQueryLength?: number;
  /** Начальное значение строки поиска (например из URL). */
  initialQuery?: string;
};

export function useProductSearchSuggest(options?: Options) {
  const initialQuery = (options?.initialQuery ?? "").trim();
  const enabled = options?.suggestEnabled ?? true;
  const minQueryLength = Math.max(1, options?.minQueryLength ?? 1);
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<ProductSearchHit[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setQ(initialQuery);
    setDebounced(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!enabled || debounced.length < minQueryLength) {
      setHits([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const params = new URLSearchParams();
        params.set("q", debounced);
        params.set("limit", "8");
        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { items: ProductSearchHit[] };
        if (!cancelled) setHits(data.items ?? []);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, enabled, minQueryLength]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const closeSuggestions = useCallback(() => setOpen(false), []);

  const goSearch = useCallback(() => {
    const t = q.trim();
    setOpen(false);
    if (!t) return;
    router.push(`/search?q=${encodeURIComponent(t)}`);
  }, [q, router]);

  const setQuery = useCallback((value: string) => {
    setQ(value);
    setOpen(true);
  }, []);

  const onFocusInput = useCallback(() => setOpen(true), []);

  return {
    q,
    setQuery,
    debounced,
    open,
    setOpen,
    loading,
    hits,
    wrapRef,
    closeSuggestions,
    goSearch,
    onFocusInput,
  };
}
