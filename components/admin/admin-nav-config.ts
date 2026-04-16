export type AdminNavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
};

/** Порядок важен: более узкие правила (create) идут после общих только если match у «Магазины» уже исключает create. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin/stores",
    label: "Все магазины",
    match: (p) =>
      p === "/admin/stores" ||
      (p.startsWith("/admin/stores/") && !p.startsWith("/admin/stores/create")),
  },
  {
    href: "/admin/stores/create",
    label: "Добавить магазин",
    match: (p) => p.startsWith("/admin/stores/create"),
  },
  {
    href: "/admin/banners",
    label: "Баннеры",
    match: (p) => p.startsWith("/admin/banners"),
  },
  {
    href: "/admin/site-social",
    label: "Соц. сети",
    match: (p) => p.startsWith("/admin/site-social"),
  },
];
