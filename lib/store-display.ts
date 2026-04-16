import type { StoreFulfillmentMode } from "@prisma/client";

/** Короткий текст для карточек, meta, сниппетов: short → full. */
export function storePublicShortText(store: {
  shortDescription: string | null;
  fullDescription: string | null;
}): string | null {
  const a = store.shortDescription?.trim();
  if (a) return a;
  const b = store.fullDescription?.trim();
  return b && b.length > 0 ? b : null;
}

/** Полный текст для страницы магазина: full → short. */
export function storePublicFullText(store: {
  fullDescription: string | null;
  shortDescription: string | null;
}): string | null {
  const a = store.fullDescription?.trim();
  if (a) return a;
  const b = store.shortDescription?.trim();
  return b && b.length > 0 ? b : null;
}

function oneFulfillmentModeLabel(mode: StoreFulfillmentMode): string {
  if (mode === "delivery") return "Доставка";
  if (mode === "pickup") return "Самовывоз";
  if (mode === "offline") return "Офлайн";
  return String(mode);
}

export function fulfillmentModeLabel(modes: StoreFulfillmentMode[]): string {
  const unique = Array.from(new Set(modes));
  if (unique.length === 0) return "Не указано";
  return unique.map(oneFulfillmentModeLabel).join(", ");
}

/** Ключи дней в JSON графика работы (как в админке и в БД). */
export const STORE_WORKING_HOURS_DAY_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type StoreWorkingHoursDayKey = (typeof STORE_WORKING_HOURS_DAY_KEYS)[number];

export const STORE_WORKING_HOURS_DAY_LABEL_RU: Record<StoreWorkingHoursDayKey, string> = {
  mon: "Понедельник",
  tue: "Вторник",
  wed: "Среда",
  thu: "Четверг",
  fri: "Пятница",
  sat: "Суббота",
  sun: "Воскресенье",
};

const DAY_KEYS = STORE_WORKING_HOURS_DAY_KEYS;
const DAY_LABEL = STORE_WORKING_HOURS_DAY_LABEL_RU;

/**
 * Простое отображение JSON графика (объект по дням или произвольный JSON).
 */
export function formatWorkingHoursHuman(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof value !== "object") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return value.map((v) => String(v)).join("; ");
  }
  const o = value as Record<string, unknown>;
  const lines: string[] = [];
  for (const k of DAY_KEYS) {
    if (!(k in o)) continue;
    const v = o[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    lines.push(`${DAY_LABEL[k]}: ${s}`);
  }
  if (lines.length > 0) return lines.join("\n");
  try {
    const entries = Object.entries(o).filter(
      ([, v]) => v != null && String(v).trim() !== "",
    );
    if (entries.length === 0) return null;
    return entries.map(([k, v]) => `${k}: ${String(v)}`).join("\n");
  } catch {
    return null;
  }
}
