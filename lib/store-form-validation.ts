/** Поля магазина, обязательные для создания и сохранения в админке. */
export const STORE_REQUIRED_FIELD_KEYS = [
  "name",
  "xmlUrl",
  "website",
  "fulfillmentModes",
  "latitude",
  "longitude",
] as const;

export type StoreRequiredFieldKey = (typeof STORE_REQUIRED_FIELD_KEYS)[number];

function trimStr(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

function parseCoord(v: FormDataEntryValue | null): number | null {
  const s = trimStr(v);
  if (!s) return null;
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Список ключей полей с ошибкой (пусто — всё заполнено корректно). */
export function validateStoreRequiredFields(formData: FormData): StoreRequiredFieldKey[] {
  const errors: StoreRequiredFieldKey[] = [];

  if (!trimStr(formData.get("name"))) {
    errors.push("name");
  }

  if (!trimStr(formData.get("xmlUrl"))) {
    errors.push("xmlUrl");
  }

  if (!trimStr(formData.get("website"))) {
    errors.push("website");
  }

  const modes = formData
    .getAll("fulfillmentModes")
    .map((v) => String(v ?? "").trim().toLowerCase())
    .filter((v) => v.length > 0);
  if (modes.length === 0 || modes.some((v) => !["delivery", "pickup", "offline"].includes(v))) {
    errors.push("fulfillmentModes");
  }

  const lat = parseCoord(formData.get("latitude"));
  if (lat === null) {
    errors.push("latitude");
  } else if (lat < -90 || lat > 90) {
    errors.push("latitude");
  }

  const lng = parseCoord(formData.get("longitude"));
  if (lng === null) {
    errors.push("longitude");
  } else if (lng < -180 || lng > 180) {
    errors.push("longitude");
  }

  return errors;
}

export const STORE_REQUIRED_FIELDS_MESSAGE = "Заполните обязательные поля";
