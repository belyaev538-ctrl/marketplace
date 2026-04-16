/** Один query-параметр из Next.js searchParams (string | string[] | undefined). */
export function firstSearchParam(
  value: string | string[] | undefined
): string | undefined {
  if (value == null) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed === "" ? undefined : trimmed;
}

/** Все непустые значения query-параметра из Next.js searchParams. */
export function manySearchParams(
  value: string | string[] | undefined,
): string[] {
  if (value == null) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v !== "");
}
