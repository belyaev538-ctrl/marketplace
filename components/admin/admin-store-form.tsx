"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  STORE_REQUIRED_FIELDS_MESSAGE,
  validateStoreRequiredFields,
} from "@/lib/store-form-validation";
import { slugifyStoreNameInput } from "@/lib/store-slug";
import { STORE_BUSINESS_TYPE_OPTIONS } from "@/lib/store-business-type";

const adminTextFieldClass =
  "w-full rounded-md border border-blueExtraLight bg-blueUltraLight py-2 ps-2.5 pe-2.5 text-[13px] font-medium text-[#032339] outline-none placeholder:text-[#3E6897]/80 placeholder:font-normal focus:border-[#0B63CE] focus-visible:border-[#0B63CE]";

const adminSecondaryLinkClass =
  "inline-flex w-full items-center justify-center rounded-md border border-blueExtraLight bg-white py-2.5 text-center text-[13px] font-semibold text-blueNavy transition-colors hover:border-blue hover:text-blue sm:w-auto sm:min-w-[140px]";

const adminLabelClass = "text-xs font-normal text-[#3E6897]";

function adminInputClass(invalid: boolean) {
  return invalid
    ? `${adminTextFieldClass} border-2 border-red-500 ring-2 ring-red-200 focus:border-red-500 focus-visible:border-red-500`
    : adminTextFieldClass;
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-lg bg-white p-3.5 shadow-[0_15px_35px_0_#0B63CE33] md:p-4">
      <h2 className="text-sm font-normal leading-snug text-[#3E6897]">{title}</h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

export type AdminStoreFormDefaults = {
  name?: string;
  slug?: string;
  logo?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  workDescription?: string | null;
  xmlUrl?: string | null;
  fallbackUrl?: string | null;
  website?: string | null;
  vkUrl?: string | null;
  telegramUrl?: string | null;
  whatsappUrl?: string | null;
  otherMessengerUrl?: string | null;
  /** Значения `StoreBusinessType` */
  businessTypes?: string[];
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  storeType?: string;
  fulfillmentModes?: string[];
  active?: boolean;
  showProducts?: boolean;
  autoImport?: boolean;
  /** 0–23, час UTC для ежедневного автоимпорта */
  autoImportHourUtc?: number;
  workingHours?: string;
};

const FULFILLMENT_OPTIONS = [
  { value: "delivery", label: "Доставка" },
  { value: "pickup", label: "Самовывоз" },
  { value: "offline", label: "Офлайн" },
] as const;

type Props = {
  action: (formData: FormData) => Promise<void>;
  storeId?: string;
  defaults?: AdminStoreFormDefaults;
  savedNotice?: boolean;
  cancelHref: string;
  submitLabel: string;
};

export function AdminStoreForm({
  action,
  storeId,
  defaults = {},
  savedNotice = false,
  cancelHref,
  submitLabel,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const restaurantDefaultChecked = defaults.businessTypes?.includes("restaurant") ?? false;
  const restaurantsCafesDefaultChecked = defaults.businessTypes?.includes("restaurants_cafes") ?? false;
  const defaultBusinessTypes = new Set<string>(defaults.businessTypes ?? []);
  if (restaurantDefaultChecked) defaultBusinessTypes.add("restaurant");
  if (restaurantsCafesDefaultChecked) defaultBusinessTypes.add("restaurants_cafes");

  const isEdit = Boolean(storeId);
  const [name, setName] = useState(defaults.name ?? "");
  const [slug, setSlug] = useState(defaults.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [logoPath, setLogoPath] = useState<string | null>(defaults.logo?.trim() || null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoRemoving, setLogoRemoving] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  /** Превью файла логотипа при создании магазина (отправляется с формой как logoFile). */
  const [createLogoObjectUrl, setCreateLogoObjectUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(() => new Set());
  const [submitBanner, setSubmitBanner] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showSavedNotice, setShowSavedNotice] = useState(savedNotice);
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<Set<string>>(
    () => new Set(defaultBusinessTypes),
  );
  const [businessTypesOpen, setBusinessTypesOpen] = useState(false);
  const businessTypesDropdownRef = useRef<HTMLDivElement | null>(null);

  const clearFieldError = useCallback((key: string) => {
    setFieldErrors((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setSubmitBanner(null);
  }, []);

  useEffect(() => {
    return () => {
      if (createLogoObjectUrl) URL.revokeObjectURL(createLogoObjectUrl);
    };
  }, [createLogoObjectUrl]);

  useEffect(() => {
    if (!businessTypesOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const el = businessTypesDropdownRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setBusinessTypesOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [businessTypesOpen]);

  useEffect(() => {
    setShowSavedNotice(savedNotice);
  }, [savedNotice]);

  const closeSavedNotice = useCallback(() => {
    setShowSavedNotice(false);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("saved");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const onNameChange = useCallback(
    (v: string) => {
      setName(v);
      clearFieldError("name");
      if (!slugTouched) {
        setSlug(slugifyStoreNameInput(v));
      }
    },
    [slugTouched, clearFieldError],
  );

  const onSubmitForm = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      const errs = validateStoreRequiredFields(fd);
      if (errs.length > 0) {
        setFieldErrors(new Set(errs));
        setSubmitBanner(STORE_REQUIRED_FIELDS_MESSAGE);
        return;
      }
      setFieldErrors(new Set());
      setSubmitBanner(null);
      startTransition(() => {
        void action(fd);
      });
    },
    [action],
  );

  const uploadLogo = useCallback(async () => {
    if (!storeId) return;
    const input = logoFileRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setLogoError("Выберите файл");
      return;
    }
    setLogoError(null);
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.set("storeId", storeId);
      fd.set("file", file);
      const res = await fetch("/api/upload/store-logo", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok || !data.url) {
        setLogoError(data.error ?? "Не удалось загрузить");
        return;
      }
      setLogoPath(data.url);
      if (input) input.value = "";
    } catch {
      setLogoError("Ошибка сети");
    } finally {
      setLogoUploading(false);
    }
  }, [storeId]);

  const removeLogo = useCallback(async () => {
    if (!storeId || !logoPath) return;
    if (!window.confirm("Удалить логотип? Файл на сервере будет удалён (если загружен через админку).")) {
      return;
    }
    setLogoError(null);
    setLogoRemoving(true);
    try {
      const res = await fetch(
        `/api/upload/store-logo?storeId=${encodeURIComponent(storeId)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setLogoError(data.error ?? "Не удалось удалить");
        return;
      }
      setLogoPath(null);
      if (logoFileRef.current) logoFileRef.current.value = "";
    } catch {
      setLogoError("Ошибка сети");
    } finally {
      setLogoRemoving(false);
    }
  }, [storeId, logoPath]);

  return (
    <>
      <form
        noValidate
        onSubmit={onSubmitForm}
        className="flex w-full min-w-0 max-w-none flex-col gap-5"
      >
      {submitBanner ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
          role="alert"
        >
          {submitBanner}
        </p>
      ) : null}
      {storeId ? (
        <input type="hidden" name="storeId" value={storeId} />
      ) : null}

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5 xl:grid-cols-12 xl:gap-6 lg:items-start">
        {/* Колонка 1: идентичность и тексты */}
        <div className="flex min-w-0 flex-col gap-4 md:col-span-1 xl:order-2 xl:col-span-4">
          <FormSection title="Основное">
            <div className="flex flex-col gap-2">
              <label htmlFor="store-name" className={adminLabelClass}>
                Название <span className="text-red-600">*</span>
              </label>
              <input
                id="store-name"
                name="name"
                type="text"
                autoComplete="off"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Например, Рыболовный мир"
                className={adminInputClass(fieldErrors.has("name"))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="store-slug" className={adminLabelClass}>
                Slug
              </label>
              <input
                id="store-slug"
                name="slug"
                type="text"
                autoComplete="off"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="latin-kebab-case"
                className={adminTextFieldClass}
              />
              <p className="text-[11px] leading-snug text-blueSteel">
                Из названия; витрина по старому slug, пока не смените вручную.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className={adminLabelClass}>Логотип</span>
              {storeId ? (
                <>
                  <div className="flex min-h-[64px] flex-wrap items-center justify-between gap-2 rounded-md border border-blueExtraLight bg-blueUltraLight/30 px-2.5 py-2">
                    {logoPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoPath}
                        alt=""
                        className="max-h-16 w-auto max-w-[180px] object-contain"
                      />
                    ) : (
                      <p className="text-[12px] font-medium text-blueSteel">Не загружен</p>
                    )}
                    {logoPath ? (
                      <button
                        type="button"
                        disabled={logoUploading || logoRemoving}
                        onClick={() => void removeLogo()}
                        className="shrink-0 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        {logoRemoving ? "…" : "Удалить"}
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                    disabled={logoRemoving}
                    className="text-[12px] font-medium text-blueNavy file:me-2 file:rounded-md file:border-0 file:bg-blueUltraLight file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-blueNavy disabled:opacity-50"
                  />
                  <button
                    type="button"
                    disabled={logoUploading || logoRemoving}
                    onClick={() => void uploadLogo()}
                    className="inline-flex w-full items-center justify-center rounded-md border border-blue bg-white py-2 text-xs font-bold text-blue transition-colors hover:bg-blueUltraLight disabled:opacity-50"
                  >
                    {logoUploading ? "Загрузка…" : "Загрузить логотип"}
                  </button>
                  {logoError ? (
                    <p className="text-xs font-medium text-red-600" role="alert">
                      {logoError}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-blueSteel">PNG/JPG/WebP, до 2 МБ → WebP.</p>
                </>
              ) : (
                <>
                  <div className="flex min-h-[64px] flex-wrap items-center gap-2 rounded-md border border-blueExtraLight bg-blueUltraLight/30 px-2.5 py-2">
                    {createLogoObjectUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={createLogoObjectUrl}
                        alt=""
                        className="max-h-16 w-auto max-w-[180px] object-contain"
                      />
                    ) : (
                      <p className="text-[12px] font-medium text-blueSteel">Файл не выбран</p>
                    )}
                  </div>
                  <input
                    type="file"
                    name="logoFile"
                    accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                    className="text-[12px] font-medium text-blueNavy file:me-2 file:rounded-md file:border-0 file:bg-blueUltraLight file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-blueNavy"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setCreateLogoObjectUrl(f ? URL.createObjectURL(f) : null);
                    }}
                  />
                  <p className="text-[11px] leading-snug text-blueSteel">
                    PNG/JPG/WebP до 2 МБ. Файл сохранится при нажатии «{submitLabel}» (конвертация в WebP на
                    сервере).
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <span className={adminLabelClass}>Тип магазина</span>
              <p className="text-[11px] leading-snug text-blueSteel">
                Несколько значений; можно оставить пустым.
              </p>
              <div ref={businessTypesDropdownRef} className="relative">
                {Array.from(selectedBusinessTypes).map((value) => (
                  <input key={`business-type-hidden-${value}`} type="hidden" name="businessTypes" value={value} />
                ))}
                <button
                  type="button"
                  onClick={() => setBusinessTypesOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-blueExtraLight bg-blueUltraLight/30 px-2.5 py-2 text-[12px] font-medium text-blueNavy"
                >
                  <span className="truncate">
                    {selectedBusinessTypes.size > 0
                      ? `Выбрано: ${selectedBusinessTypes.size}`
                      : "Выберите тип магазина"}
                  </span>
                  <span
                    className={`text-blueSteel transition-transform ${businessTypesOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  >
                    ▾
                  </span>
                </button>
                {businessTypesOpen ? (
                  <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-md border border-blueExtraLight bg-white shadow-[0_15px_35px_0_#0B63CE33]">
                    <div className="flex max-h-[220px] flex-col gap-2 overflow-auto px-2.5 py-2.5 pe-1">
                      {STORE_BUSINESS_TYPE_OPTIONS.map(({ value, label }) => {
                        const checked = selectedBusinessTypes.has(String(value));
                        return (
                          <label
                            key={value}
                            className="flex cursor-pointer items-center gap-2.5"
                          >
                            <input
                              type="checkbox"
                              value={value}
                              checked={checked}
                              onChange={(e) => {
                                const next = new Set(selectedBusinessTypes);
                                if (e.target.checked) next.add(String(value));
                                else next.delete(String(value));
                                setSelectedBusinessTypes(next);
                              }}
                              className="h-4 w-4 shrink-0 rounded border border-blue text-blue focus:ring-blue"
                            />
                            <span className="text-[12px] font-medium text-blueNavy">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </FormSection>

          <FormSection title="Описание">
            <div className="flex flex-col gap-2">
              <label htmlFor="store-short-desc" className={adminLabelClass}>
                Краткое
              </label>
              <textarea
                id="store-short-desc"
                name="shortDescription"
                rows={2}
                defaultValue={defaults.shortDescription ?? ""}
                className={`${adminTextFieldClass} min-h-[64px] resize-y`}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="store-full-desc" className={adminLabelClass}>
                Полное
              </label>
              <textarea
                id="store-full-desc"
                name="fullDescription"
                rows={4}
                defaultValue={defaults.fullDescription ?? ""}
                className={`${adminTextFieldClass} min-h-[100px] resize-y`}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="store-work-desc" className={adminLabelClass}>
                Как работает магазин
              </label>
              <textarea
                id="store-work-desc"
                name="workDescription"
                rows={3}
                defaultValue={defaults.workDescription ?? ""}
                placeholder="Доставка, самовывоз…"
                className={`${adminTextFieldClass} min-h-[80px] resize-y`}
              />
              <p className="text-[11px] leading-snug text-blueSteel">
                Блок «Как мы работаем» на витрине под контактами.
              </p>
            </div>
          </FormSection>
        </div>

        {/* Колонка 2: ссылки и контакты */}
        <div className="flex min-w-0 flex-col gap-4 md:col-span-1 xl:order-1 xl:col-span-5">
          <FormSection title="Ссылки и выгрузка">
            <div className="flex flex-col gap-2">
              <label htmlFor="store-xml-url" className={adminLabelClass}>
                URL XML <span className="text-red-600">*</span>
              </label>
              <input
                id="store-xml-url"
                name="xmlUrl"
                type="url"
                autoComplete="off"
                defaultValue={defaults.xmlUrl ?? ""}
                placeholder="https://…"
                onChange={() => clearFieldError("xmlUrl")}
                className={adminInputClass(fieldErrors.has("xmlUrl"))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="store-fallback-url" className={adminLabelClass}>
                Fallback URL
              </label>
              <input
                id="store-fallback-url"
                name="fallbackUrl"
                type="url"
                autoComplete="off"
                defaultValue={defaults.fallbackUrl ?? ""}
                placeholder="https://…"
                className={adminTextFieldClass}
              />
              <p className="text-[11px] leading-snug text-blueSteel">
                Запасная ссылка на витрину магазина: на карточке товара кнопка «Купить в магазине» и
                похожие места берут сначала ссылку с товара, затем этот URL, и только потом поле
                «Сайт». Удобно, если основной сайт — лендинг, а покупка — на отдельном адресе.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="store-website" className={adminLabelClass}>
                Сайт <span className="text-red-600">*</span>
              </label>
              <input
                id="store-website"
                name="website"
                type="url"
                autoComplete="off"
                defaultValue={defaults.website ?? ""}
                onChange={() => clearFieldError("website")}
                className={adminInputClass(fieldErrors.has("website"))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="store-vk" className={adminLabelClass}>
                  ВКонтакте
                </label>
                <input
                  id="store-vk"
                  name="vkUrl"
                  type="url"
                  autoComplete="off"
                  defaultValue={defaults.vkUrl ?? ""}
                  className={adminTextFieldClass}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="store-tg" className={adminLabelClass}>
                  Telegram
                </label>
                <input
                  id="store-tg"
                  name="telegramUrl"
                  type="url"
                  autoComplete="off"
                  defaultValue={defaults.telegramUrl ?? ""}
                  className={adminTextFieldClass}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="store-wa" className={adminLabelClass}>
                  WhatsApp
                </label>
                <input
                  id="store-wa"
                  name="whatsappUrl"
                  type="url"
                  autoComplete="off"
                  defaultValue={defaults.whatsappUrl ?? ""}
                  className={adminTextFieldClass}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="store-other-msg" className={adminLabelClass}>
                  MAX
                </label>
                <input
                  id="store-other-msg"
                  name="otherMessengerUrl"
                  type="url"
                  autoComplete="off"
                  defaultValue={defaults.otherMessengerUrl ?? ""}
                  className={adminTextFieldClass}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Контакты и карта">
            <div className="flex flex-col gap-2">
              <label htmlFor="store-phone" className={adminLabelClass}>
                Телефон
              </label>
              <input
                id="store-phone"
                name="phone"
                type="text"
                autoComplete="off"
                defaultValue={defaults.phone ?? ""}
                className={adminTextFieldClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="store-address" className={adminLabelClass}>
                Адрес
              </label>
              <textarea
                id="store-address"
                name="address"
                rows={2}
                defaultValue={defaults.address ?? ""}
                className={`${adminTextFieldClass} min-h-[60px] resize-y`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex min-w-0 flex-col gap-2">
                <label htmlFor="store-lat" className={adminLabelClass}>
                  Широта <span className="text-red-600">*</span>
                </label>
                <input
                  id="store-lat"
                  name="latitude"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Напр. 55.7558"
                  defaultValue={
                    defaults.latitude != null && Number.isFinite(defaults.latitude)
                      ? String(defaults.latitude)
                      : ""
                  }
                  onChange={() => clearFieldError("latitude")}
                  className={adminInputClass(fieldErrors.has("latitude"))}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <label htmlFor="store-lng" className={adminLabelClass}>
                  Долгота <span className="text-red-600">*</span>
                </label>
                <input
                  id="store-lng"
                  name="longitude"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Напр. 37.6176"
                  defaultValue={
                    defaults.longitude != null && Number.isFinite(defaults.longitude)
                      ? String(defaults.longitude)
                      : ""
                  }
                  onChange={() => clearFieldError("longitude")}
                  className={adminInputClass(fieldErrors.has("longitude"))}
                />
              </div>
            </div>
          </FormSection>
        </div>

        {/* Колонка 3: режимы и активность */}
        <div className="flex min-w-0 flex-col gap-4 md:col-span-2 xl:order-3 xl:col-span-3 xl:sticky xl:top-4">
          <FormSection title="Тип и формат">
            <div className="flex flex-col gap-2">
              <label htmlFor="store-fulfillment" className={adminLabelClass}>
                Формат работы <span className="text-red-600">*</span>
              </label>
              <div
                id="store-fulfillment"
                className={`${adminInputClass(fieldErrors.has("fulfillmentModes"))} flex flex-col gap-2 rounded-md bg-blueUltraLight/40 p-2.5`}
              >
                {FULFILLMENT_OPTIONS.map((opt) => (
                  <label key={opt.value} className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      name="fulfillmentModes"
                      type="checkbox"
                      value={opt.value}
                      defaultChecked={
                        defaults.fulfillmentModes?.length
                          ? defaults.fulfillmentModes.includes(opt.value)
                          : opt.value === "delivery"
                      }
                      onChange={() => clearFieldError("fulfillmentModes")}
                      className="h-3.5 w-3.5 shrink-0 rounded border border-blueExtraLight text-blue accent-blue focus:outline-none focus:ring-2 focus:ring-blue focus:ring-offset-0"
                    />
                    <span className="text-[13px] font-medium text-blueNavy">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <input
              type="hidden"
              name="storeType"
              defaultValue={defaults.storeType ?? "xml"}
            />
          </FormSection>

          <FormSection title="Режим работы">
            <textarea
              id="store-working-hours"
              name="workingHours"
              rows={4}
              defaultValue={defaults.workingHours ?? ""}
              placeholder="пн–пт 9:00–20:00…"
              aria-label="Режим работы"
              className={`${adminTextFieldClass} min-h-[96px] resize-y`}
            />
          </FormSection>

          <FormSection title="Активность и импорт">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                name="active"
                type="checkbox"
                defaultChecked={defaults.active !== false}
                className="h-3.5 w-3.5 shrink-0 rounded border border-blueExtraLight text-blue accent-blue focus:outline-none focus:ring-2 focus:ring-blue focus:ring-offset-0"
              />
              <span className="text-[13px] font-medium text-blueNavy">Активен</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                name="showProducts"
                type="checkbox"
                defaultChecked={defaults.showProducts !== false}
                className="h-3.5 w-3.5 shrink-0 rounded border border-blueExtraLight text-blue accent-blue focus:outline-none focus:ring-2 focus:ring-blue focus:ring-offset-0"
              />
              <span className="text-[13px] font-medium text-blueNavy">Товары в каталоге</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                name="autoImport"
                type="checkbox"
                defaultChecked={defaults.autoImport !== false}
                className="h-3.5 w-3.5 shrink-0 rounded border border-blueExtraLight text-blue accent-blue focus:outline-none focus:ring-2 focus:ring-blue focus:ring-offset-0"
              />
              <span className="text-[13px] font-medium text-blueNavy">Автоимпорт (cron)</span>
            </label>
            <div className="mt-1 flex flex-col gap-2 border-l-2 border-blueExtraLight ps-3">
              <label htmlFor="store-auto-import-hour" className={adminLabelClass}>
                Час UTC (0–23)
              </label>
              <input
                id="store-auto-import-hour"
                name="autoImportHourUtc"
                type="number"
                min={0}
                max={23}
                step={1}
                defaultValue={
                  defaults.autoImportHourUtc != null &&
                  Number.isFinite(defaults.autoImportHourUtc) &&
                  defaults.autoImportHourUtc >= 0 &&
                  defaults.autoImportHourUtc <= 23
                    ? defaults.autoImportHourUtc
                    : 3
                }
                className={`${adminTextFieldClass} max-w-[88px]`}
              />
              <p className="text-[11px] leading-snug text-blueSteel">
                Раз в сутки в начале выбранного часа UTC. МСК зимой: +3 к UTC.
              </p>
            </div>
          </FormSection>
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-3 border-t border-blueExtraLight pt-4 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-blue py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-60 sm:w-auto sm:min-w-[180px]"
        >
          {isPending ? "Сохранение…" : submitLabel}
        </button>
        <Link href={cancelHref} prefetch={false} className={adminSecondaryLinkClass}>
          Отмена
        </Link>
      </div>
      </form>
      {showSavedNotice ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-blueNavy/40 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={closeSavedNotice}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Изменения сохранены"
            className="w-full max-w-sm rounded-2xl border border-blueExtraLight bg-white p-6 shadow-lg shadow-[#3458821a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M20 7L10 17L5 12"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p className="text-base font-extrabold text-blueNavy">Изменения сохранены</p>
              <button
                type="button"
                onClick={closeSavedNotice}
                className="mt-1 inline-flex min-w-[140px] items-center justify-center rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
