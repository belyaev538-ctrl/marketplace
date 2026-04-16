"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState, useTransition } from "react";
import {
  deleteStore,
  runManualImport,
  setStoreShowProducts,
} from "@/app/admin/stores/actions";

export type AdminStoreRowDTO = {
  id: string;
  name: string;
  logo: string | null;
  active: boolean;
  showProducts: boolean;
  lastImportAt: string | null;
  lastImportStatus: string | null;
  hasXmlUrl: boolean;
  productCount: number;
  sourceCategoryCount: number;
  unmappedCount: number;
  hasMapping: boolean;
};

type Props = {
  rows: AdminStoreRowDTO[];
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Подпись статуса последней выгрузки для UI (в БД могут быть англ. коды). */
function formatImportStatusLabel(status: string | null): string | null {
  if (!status?.trim()) return null;
  const key = status.trim().toLowerCase();
  const map: Record<string, string> = {
    success: "Успешно",
    failed: "Ошибка",
    pending: "В очереди",
    processing: "Выполняется",
    timeout: "Таймаут",
  };
  return map[key] ?? status;
}

function importStatusRowClass(status: string): string {
  const key = status.trim().toLowerCase();
  if (key === "success") return "text-emerald-800";
  if (key === "failed" || key === "timeout") return "text-red-700";
  return "text-blueSteel";
}

/** Сетка колонок как у бывшей таблицы; тени как у `.catalog-product-card.product_card` в каталоге. */
const storeRowGridClass =
  "grid w-full grid-cols-1 gap-3 sm:grid-cols-[minmax(260px,2.2fr)_minmax(90px,1fr)_minmax(90px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(200px,260px)] sm:items-center sm:gap-x-4";

const storeRowHeaderGridClass =
  "hidden w-full grid-cols-[minmax(260px,2.2fr)_minmax(90px,1fr)_minmax(90px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(200px,260px)] gap-x-4 sm:grid sm:items-center";

const storeRowCardClass =
  "bg-white p-4 sm:px-5 sm:py-4";

export function AdminStoresList({ rows }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nameQuery, setNameQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [toggleTarget, setToggleTarget] = useState<{
    id: string;
    name: string;
    next: boolean;
  } | null>(null);
  const deleteTitleId = useId();
  const deleteDescId = useId();
  const toggleTitleId = useId();
  const toggleDescId = useId();
  const normalizedQuery = nameQuery.trim().toLowerCase();
  const visibleRows = useMemo(() => {
    if (!normalizedQuery) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(normalizedQuery));
  }, [rows, normalizedQuery]);

  const closeDeleteModal = useCallback(() => {
    if (!pending) setDeleteTarget(null);
  }, [pending]);
  const closeToggleModal = useCallback(() => {
    if (!pending) setToggleTarget(null);
  }, [pending]);

  useEffect(() => {
    if (!deleteTarget && !toggleTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (deleteTarget) closeDeleteModal();
      if (toggleTarget) closeToggleModal();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [deleteTarget, toggleTarget, closeDeleteModal, closeToggleModal]);

  function onImport(storeId: string, name: string) {
    startTransition(async () => {
      const res = await runManualImport(storeId);
      if (res.ok) {
        alert(`Выгрузка «${name}» успешно выполнена.`);
        router.refresh();
      } else {
        alert(`Ошибка выгрузки: ${res.error}`);
      }
    });
  }

  function onToggleCatalog(storeId: string, next: boolean, name: string) {
    setToggleTarget({ id: storeId, name, next });
  }

  function confirmToggleCatalog() {
    if (!toggleTarget || pending) return;
    const { id, next, name } = toggleTarget;
    startTransition(async () => {
      const res = await setStoreShowProducts(id, next);
      if (res.ok) {
        setToggleTarget(null);
        router.refresh();
      } else {
        alert(`Не удалось изменить «${name}»: ${res.error}`);
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget || pending) return;
    const { id } = deleteTarget;
    startTransition(async () => {
      const res = await deleteStore(id);
      if (res.ok) {
        setDeleteTarget(null);
        router.refresh();
      } else {
        alert(`Не удалось удалить: ${res.error}`);
      }
    });
  }

  return (
    <div className="mx-auto max-w-7xl bg-white px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-blueNavy">Магазины</h1>
        </div>
        <div className="w-full sm:w-auto">
          <label htmlFor="admin-stores-name-search" className="sr-only">
            Поиск магазина по названию
          </label>
          <input
            id="admin-stores-name-search"
            type="text"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="Поиск по названию магазина"
            className="h-10 w-full rounded-md border border-blueExtraLight bg-white px-3 text-[13px] font-medium text-blueNavy outline-none placeholder:text-blueSteel sm:w-[320px]"
          />
        </div>
      </div>

      <div className="overflow-x-auto px-2 py-5 [-webkit-overflow-scrolling:touch] sm:px-3">
        <div className="flex min-w-[900px] flex-col gap-[10px]">
          {visibleRows.length > 0 ? (
            <div
              className={`${storeRowHeaderGridClass} px-4 pb-1 text-[12px] font-normal leading-tight text-blueNavy sm:px-5`}
              aria-hidden
            >
              <div className="flex items-center gap-3">
                <span className="hidden w-[35px] shrink-0 sm:block" aria-hidden />
                Название магазина
              </div>
              <div
                className="text-center sm:relative sm:left-[-20px]"
                style={{ textAlign: "center", transform: "translateX(-20px)" }}
              >
                Товаров
              </div>
              <div
                className="text-center sm:relative sm:left-[-20px]"
                style={{ textAlign: "center", transform: "translateX(-20px)" }}
              >
                Категорий
              </div>
              <div
                className="text-center sm:relative sm:left-[-30px]"
                style={{ textAlign: "center", transform: "translateX(-30px)" }}
              >
                Публикация
              </div>
              <div title="Последняя выгрузка из XML">Дата выгрузки</div>
              <div className="text-right">Действия</div>
            </div>
          ) : null}

          {visibleRows.length === 0 ? (
            <div
              className={`${storeRowCardClass} py-10 text-center text-sm text-blueSteel`}
            >
              {normalizedQuery ? "По вашему запросу магазины не найдены." : "Магазинов пока нет. Создайте первый."}
            </div>
          ) : (
            visibleRows.map((row) => {
              const hasUnmapped = row.unmappedCount > 0;
              return (
                <article
                  key={row.id}
                  className={`${storeRowCardClass} ${visibleRows[0]?.id === row.id ? "" : "border-t border-blueExtraLight"}`}
                >
                  <div className={storeRowGridClass}>
                    <div className="flex min-w-0 gap-3 sm:min-h-[35px] sm:items-center">
                      <div className="flex h-[18px] w-[55px] shrink-0 items-center justify-start">
                        {row.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.logo}
                            alt=""
                            className="h-[18px] w-auto max-w-[55px] object-contain object-left"
                          />
                        ) : (
                          <div
                            className="h-[18px] w-[18px] rounded-md border border-dashed border-blueExtraLight bg-blueUltraLight/40"
                            aria-hidden
                          />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col sm:justify-center">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-blueSteel sm:hidden">
                          Магазин
                        </div>
                        <div className="text-[14px] font-bold leading-snug text-blueNavy">{row.name}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={row.showProducts}
                            aria-label={`Товары в каталоге: ${row.showProducts ? "включено" : "выключено"}`}
                            title={
                              !row.active
                                ? "Магазин неактивен в настройках — витрина и каталог недоступны, пока не включите «Активен»."
                                : row.showProducts
                                  ? "Товары участвуют в каталоге и в списке магазинов в шапке. Выключите, чтобы скрыть из каталога (данные и маппинг не меняются)."
                                  : "Включите, чтобы снова показывать товары в каталоге и в шапке сайта."
                            }
                            disabled={pending}
                            onClick={() => onToggleCatalog(row.id, !row.showProducts, row.name)}
                            className={`relative inline-flex h-[17px] w-[34px] shrink-0 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 disabled:opacity-50 ${
                              row.showProducts
                                ? "border-green bg-green"
                                : "border-blue bg-white"
                            }`}
                          >
                            <span
                              className={`pointer-events-none absolute start-[2px] top-0.5 inline-block h-[11px] w-[11px] rounded-full border transition-all ${
                                row.showProducts
                                  ? "translate-x-[150%] border-green bg-white"
                                  : "border-blue bg-blue"
                              }`}
                            />
                          </button>
                          <span className="text-[10px] font-semibold leading-tight text-blueSteel">
                            В каталоге
                          </span>
                        </div>
                      </div>
                    </div>
                    <div
                      className="sm:relative sm:left-[-20px] sm:flex sm:min-h-[2.75rem] sm:flex-col sm:justify-center sm:text-center"
                      style={{ textAlign: "center", transform: "translateX(-20px)" }}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-blueSteel sm:hidden">
                        Товары
                      </div>
                      <div className="tabular-nums text-[11px] font-medium leading-none text-blueNavy">
                        {row.productCount}
                      </div>
                    </div>
                    <div
                      className="sm:relative sm:left-[-20px] sm:flex sm:min-h-[2.75rem] sm:flex-col sm:justify-center sm:text-center"
                      style={{ textAlign: "center", transform: "translateX(-20px)" }}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-blueSteel sm:hidden">
                        Категории
                      </div>
                      <div className="tabular-nums text-[11px] font-medium leading-none text-blueNavy">
                        {row.sourceCategoryCount}
                      </div>
                    </div>
                    <div
                      className="text-blueNavy sm:relative sm:left-[-30px] sm:flex sm:min-h-[2.75rem] sm:items-center sm:justify-center"
                      style={{ transform: "translateX(-30px)" }}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-blueSteel sm:hidden">
                        Публикация
                      </div>
                      <div className="flex min-h-[2.5rem] max-w-[220px] items-center justify-center text-center sm:max-w-[200px]">
                        {!row.active ? (
                          <span className="block text-[11px] font-semibold leading-snug text-blueSteel">
                            Не на сайте («Активен» выкл.)
                          </span>
                        ) : !row.showProducts ? (
                          <span className="block text-[11px] font-semibold leading-snug text-amber-800">
                            Товары скрыты из каталога
                          </span>
                        ) : !row.hasMapping ? (
                          <span className="block text-[11px] font-semibold leading-snug text-red-600">
                            Не опубликован (нет маппинга)
                          </span>
                        ) : hasUnmapped ? (
                          <span className="inline-flex whitespace-nowrap rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium leading-snug text-red-600">
                            Есть непривязанные ({row.unmappedCount})
                          </span>
                        ) : (
                          <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium leading-snug text-emerald-800">
                            Всё привязано
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-blueSteel sm:flex sm:min-h-[2.75rem] sm:flex-col sm:justify-center">
                      <div className="text-[11px] font-semibold uppercase tracking-wide sm:hidden">
                        Выгрузка
                      </div>
                      <div className="text-[11px] font-medium leading-none">{formatWhen(row.lastImportAt)}</div>
                      <div
                        className={`mt-0.5 min-h-[15px] max-w-[220px] truncate text-[11px] font-medium leading-none sm:max-w-[200px] ${
                          row.lastImportStatus
                            ? importStatusRowClass(row.lastImportStatus)
                            : "text-transparent"
                        }`}
                        title={row.lastImportStatus ?? undefined}
                        aria-hidden={!row.lastImportStatus}
                      >
                        {row.lastImportStatus
                          ? formatImportStatusLabel(row.lastImportStatus)
                          : "\u00a0"}
                      </div>
                    </div>
                    <div className="sm:flex sm:min-h-[2.75rem] sm:flex-col sm:items-end sm:justify-center">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-blueSteel sm:hidden">
                        Действия
                      </div>
                      <div className="inline-grid w-max grid-cols-2 gap-2">
                        <Link
                          href={`/admin/stores/${encodeURIComponent(row.id)}/settings`}
                          prefetch={false}
                          className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg border border-[#0B63CE] bg-[#F3F8FF] px-[10px] py-1.5 text-[11px] font-bold text-[#0B63CE] transition-colors hover:bg-[#E6F0FF]"
                        >
                          Редактировать
                        </Link>
                        <button
                          type="button"
                          disabled={pending || !row.hasXmlUrl}
                          title={
                            row.hasXmlUrl
                              ? undefined
                              : "Укажите URL XML в карточке магазина"
                          }
                          onClick={() => onImport(row.id, row.name)}
                          className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg border border-[#0B63CE] bg-[#F3F8FF] px-[10px] py-1.5 text-[11px] font-bold text-[#0B63CE] transition-colors hover:bg-[#E6F0FF] disabled:opacity-50"
                        >
                          Синхронизировать
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-blueNavy/40 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={closeDeleteModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={deleteTitleId}
            aria-describedby={deleteDescId}
            className="w-full max-w-md rounded-2xl border border-blueExtraLight bg-white p-6 shadow-lg shadow-[#3458821a]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id={deleteTitleId}
              className="text-lg font-extrabold text-blueNavy"
            >
              Удалить магазин?
            </h2>
            <p id={deleteDescId} className="mt-3 text-sm leading-relaxed text-blueSteel">
              Магазин «<span className="font-semibold text-blueNavy">{deleteTarget.name}</span>»
              будет удалён вместе с товарами и связанными данными. Отменить это действие будет
              нельзя.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={closeDeleteModal}
                className="inline-flex w-full items-center justify-center rounded-xl border border-blueExtraLight bg-white px-4 py-2.5 text-sm font-bold text-blueNavy transition-colors hover:border-blue hover:bg-blueUltraLight disabled:opacity-50 sm:w-auto sm:min-w-[120px]"
              >
                Нет
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirmDelete}
                className="inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50 sm:w-auto sm:min-w-[140px]"
              >
                {pending ? "Удаление…" : "Да, удалить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toggleTarget ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-blueNavy/40 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={closeToggleModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={toggleTitleId}
            aria-describedby={toggleDescId}
            className="w-full max-w-md rounded-2xl border border-blueExtraLight bg-white p-6 shadow-lg shadow-[#3458821a]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={toggleTitleId} className="text-lg font-extrabold text-blueNavy">
              {toggleTarget.next ? "Включить товары в каталоге?" : "Скрыть товары из каталога?"}
            </h2>
            <p id={toggleDescId} className="mt-3 text-sm leading-relaxed text-blueSteel">
              Магазин «<span className="font-semibold text-blueNavy">{toggleTarget.name}</span>»{" "}
              {toggleTarget.next
                ? "будет снова показываться в каталоге и в списке магазинов в шапке."
                : "будет скрыт из каталога и из списка магазинов в шапке."}
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={closeToggleModal}
                className="inline-flex w-full items-center justify-center rounded-xl border border-blueExtraLight bg-white px-4 py-2.5 text-sm font-bold text-blueNavy transition-colors hover:border-blue hover:bg-blueUltraLight disabled:opacity-50 sm:w-auto sm:min-w-[120px]"
              >
                Нет
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirmToggleCatalog}
                className="inline-flex w-full items-center justify-center rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50 sm:w-auto sm:min-w-[140px]"
              >
                {pending ? "Сохранение…" : "Да"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
