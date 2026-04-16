/**
 * Иконки левой колонки мегаменю каталога: по порядку индекса категории (циклически).
 * Исходники лежат в `Icon/icon menu/`; копия для веба — `public/icon/menu/`.
 * При необходимости замените файлы в `public/icon/menu/` или поменяйте порядок в массиве.
 */
export const CATALOG_MEGA_MENU_ICON_FILES = [
  "34Vet_toys.svg",
  "Drive Mode.svg",
  "Edit.svg",
  "Gift.svg",
  "Group 14054.svg",
  "Group 14055.svg",
  "Hardware.svg",
  "Home.svg",
  "Laptop.svg",
  "Others-1.svg",
  "Others.svg",
  "Rectangle 2735.svg",
  "baby_pacifier_outline_nez5ie3dp0jh 2.svg",
  "comb_ed5dfikhtbuj 2.svg",
  "flowers_rt1mq44oj16p 2.svg",
  "paket_2l4zeev1r9nq 1.svg",
  "products_jrxh9s3byf14 2.svg",
  "shovel_5tec9jxvmc3y 2.svg",
] as const;

const PRODUCT_CATEGORY_ICON_OVERRIDES: Record<string, string> = {
  "Автотовары": "baby_pacifier_outline_nez5ie3dp0jh 2.svg",
  "Зоотовары": "34Vet_toys.svg",
};

export function catalogMegaMenuIconSrc(index: number, categoryName?: string): string {
  const byName = categoryName ? PRODUCT_CATEGORY_ICON_OVERRIDES[categoryName] : undefined;
  if (byName) return `/icon/menu/${encodeURIComponent(byName)}`;
  const file = CATALOG_MEGA_MENU_ICON_FILES[index % CATALOG_MEGA_MENU_ICON_FILES.length];
  return `/icon/menu/${encodeURIComponent(file)}`;
}
