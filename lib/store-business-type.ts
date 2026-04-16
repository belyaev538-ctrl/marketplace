import { StoreBusinessType } from "@prisma/client";

/** Порядок чекбоксов в админке и фильтре каталога. */
export const STORE_BUSINESS_TYPE_OPTIONS: { value: StoreBusinessType; label: string }[] = [
  { value: StoreBusinessType.grocery, label: "Продуктовый" },
  { value: StoreBusinessType.construction, label: "Строительный" },
  { value: StoreBusinessType.pet, label: "Зоотовары" },
  { value: StoreBusinessType.pharmacy, label: "Аптека" },
  { value: StoreBusinessType.electronics, label: "Электроника" },
  { value: StoreBusinessType.clothing, label: "Одежда" },
  { value: StoreBusinessType.home, label: "Товары для дома" },
  { value: StoreBusinessType.kids, label: "Детские товары" },
  { value: StoreBusinessType.beauty, label: "Красота" },
  { value: StoreBusinessType.auto, label: "Авто" },
  { value: StoreBusinessType.restaurants_cafes, label: "Рестораны и кафе" },
  { value: StoreBusinessType.services, label: "Услуги" },
  { value: StoreBusinessType.other, label: "Другое" },
];

const VALID = new Set<string>(Object.values(StoreBusinessType));
const RESTAURANTS_ENUM_VALUE = (
  (StoreBusinessType as unknown as Record<string, string>).restaurants_cafes ?? "restaurants_cafes"
) as StoreBusinessType;
function isStoreBusinessType(value: string): value is StoreBusinessType {
  return VALID.has(value);
}
function normalizeStoreBusinessTypeInput(raw: string): StoreBusinessType | null {
  const v = raw.trim();
  if (v === "restaurant" || v === "restaurants_cafes") return RESTAURANTS_ENUM_VALUE;
  return isStoreBusinessType(v) ? v : null;
}

export function storeBusinessTypeLabel(t: StoreBusinessType): string {
  return STORE_BUSINESS_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

export function formatStoreBusinessTypesHuman(types: StoreBusinessType[] | null | undefined): string {
  if (!types?.length) return "";
  return types.map(storeBusinessTypeLabel).join(", ");
}

/** Из FormData: name="businessTypes" (как в ТЗ) или повторяющиеся ключи. */
export function parseStoreBusinessTypesFromForm(
  values: FormDataEntryValue[],
): StoreBusinessType[] {
  const out = new Set<StoreBusinessType>();
  for (const raw of values) {
    const normalized = normalizeStoreBusinessTypeInput(String(raw ?? ""));
    if (normalized) out.add(normalized);
  }
  return Array.from(out);
}

export function parseStoreBusinessTypesFromQueryStrings(
  values: string[],
): StoreBusinessType[] {
  const out = new Set<StoreBusinessType>();
  for (const raw of values) {
    const normalized = normalizeStoreBusinessTypeInput(raw);
    if (normalized) out.add(normalized);
  }
  return Array.from(out);
}

/** Уникальные типы бизнеса среди переданных магазинов (для фасета «Тип магазина»). */
export function storeBusinessTypesPresentOnStores(
  stores: { businessTypes: StoreBusinessType[] }[],
): StoreBusinessType[] {
  const seen = new Set<StoreBusinessType>();
  for (const s of stores) {
    for (const t of s.businessTypes) seen.add(t);
  }
  return STORE_BUSINESS_TYPE_OPTIONS
    .map((o) => o.value)
    .filter((v): v is StoreBusinessType => isStoreBusinessType(v) && seen.has(v));
}

export type StoreBusinessTypeTileDTO = {
  value: StoreBusinessType;
  label: string;
  /** Магазины с координатами на карте, у которых в типах есть value. */
  count: number;
};

/**
 * Плитки «тип магазина» для карты: порядок как в фасете каталога, счётчик по строкам карты.
 */
export function buildStoreBusinessTypeTilesForMap(
  catalogFacetStores: { businessTypes: StoreBusinessType[] }[],
  mapStores: { businessTypes: StoreBusinessType[] }[],
): StoreBusinessTypeTileDTO[] {
  const ordered = storeBusinessTypesPresentOnStores(catalogFacetStores);
  return ordered.map((value) => {
    const label = storeBusinessTypeLabel(value);
    const count = mapStores.filter((s) => s.businessTypes.includes(value)).length;
    return { value, label, count };
  });
}

/**
 * Плитки типов магазина для мегаменю / хаба: только listable-магазины каталога, порядок как в фасете.
 */
export function buildStoreBusinessTypeTilesForCatalogMenu(
  stores: { businessTypes: StoreBusinessType[] }[],
): StoreBusinessTypeTileDTO[] {
  const counts = new Map<StoreBusinessType, number>();
  for (const r of stores) {
    const uniq = new Set(r.businessTypes);
    for (const t of Array.from(uniq)) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return STORE_BUSINESS_TYPE_OPTIONS
    .filter((o): o is { value: StoreBusinessType; label: string } => isStoreBusinessType(o.value))
    .map((o) => ({
      value: o.value,
      label: o.label,
      count: counts.get(o.value) ?? 0,
    }))
    .filter((t) => t.count > 0);
}
