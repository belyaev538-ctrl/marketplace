"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  createMarketplaceSubcategory,
  saveAllStoreCategoryMappings,
  type CategoryMappingRowInput,
} from "@/app/admin/stores/[id]/categories/actions";
import type { MpTreeNodeDTO } from "@/lib/marketplace-category-tree";

const pickerSearchInputClass =
  "w-full rounded-lg border border-blueExtraLight bg-blueUltraLight py-2 ps-3 pe-3 text-[13px] font-medium text-blueNavy outline-none placeholder:text-blueSteel focus:border-blueLight";

/** Дерево для модалки: совпадение по name/slug; при совпадении родителя показываем всех детей. */
function filterMpTreeForPicker(nodes: MpTreeNodeDTO[], query: string): MpTreeNodeDTO[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  const matches = (n: MpTreeNodeDTO) =>
    n.name.toLowerCase().includes(q) || n.slug.toLowerCase().includes(q);

  function walk(list: MpTreeNodeDTO[]): MpTreeNodeDTO[] {
    const out: MpTreeNodeDTO[] = [];
    for (const node of list) {
      const filteredKids = walk(node.children);
      if (matches(node)) {
        out.push({ ...node, children: node.children });
      } else if (filteredKids.length > 0) {
        out.push({ ...node, children: filteredKids });
      }
    }
    return out;
  }
  return walk(nodes);
}

export type SourceMappingRowDTO = {
  id: string;
  externalId: string;
  name: string;
  mappedMarketplaceCategoryIds: string[];
};

type Filter = "all" | "mapped" | "unmapped";

type Props = {
  storeId: string;
  sources: SourceMappingRowDTO[];
  /** Сброс локального состояния после refresh, когда данные с сервера обновились. */
  sourcesFingerprint: string;
  mpTree: MpTreeNodeDTO[];
};

type MpAddChildUi = {
  activeParentId: string | null;
  draftName: string;
  onDraftNameChange: (v: string) => void;
  onOpen: (parentId: string) => void;
  onClose: () => void;
  onSubmit: (parentId: string) => void;
  pending: boolean;
  error: string | null;
};

function MpBranch({
  nodes,
  level,
  selectedIds,
  onToggleMp,
  searchActive,
  addChildUi,
}: {
  nodes: MpTreeNodeDTO[];
  level: number;
  selectedIds: Set<string>;
  onToggleMp: (marketplaceCategoryId: string, checked: boolean) => void;
  /** При поиске показываем подпись уровня (1-й / 2-й …). */
  searchActive: boolean;
  /** Добавление подкатегории (2-й уровень) только под корневые рубрики в модалке. */
  addChildUi?: MpAddChildUi | null;
}) {
  return (
    <ul
      className={
        level === 0
          ? "space-y-1"
          : "ms-2 mt-0.5 space-y-0.5 border-s border-blueExtraLight/80 ps-2"
      }
    >
      {nodes.map((node) => (
        <li key={node.id}>
          <div
            className={`flex items-start gap-1 rounded-md py-1.5 pe-1 hover:bg-blueUltraLight/90 ${
              level === 0 ? "bg-blueUltraLight/55 px-2 -mx-0.5" : ""
            }`}
          >
            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={selectedIds.has(node.id)}
                onChange={(e) => onToggleMp(node.id, e.target.checked)}
                className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-blueExtraLight text-blue focus:ring-blue"
              />
              <span className="min-w-0 flex-1 leading-snug">
                {searchActive ? (
                  <span className="mb-0.5 block text-[10px] font-extrabold uppercase tracking-wide text-blue">
                    {level === 0 ? "1-й уровень" : level === 1 ? "2-й уровень" : `Уровень ${level + 1}`}
                  </span>
                ) : null}
                <span
                  className={`text-[13px] ${level === 0 ? "font-extrabold text-blueNavy" : "font-semibold text-blueNavy/95"}`}
                >
                  {node.name}
                </span>
                <span className="ms-1 font-mono text-[11px] text-blueSteel">/{node.slug}</span>
              </span>
            </label>
            {addChildUi && level === 0 ? (
              <button
                type="button"
                title="Добавить подкатегорию (2-й уровень)"
                aria-label={`Добавить подкатегорию к «${node.name}»`}
                disabled={addChildUi.pending}
                onClick={() =>
                  addChildUi.activeParentId === node.id ? addChildUi.onClose() : addChildUi.onOpen(node.id)
                }
                className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-blueExtraLight bg-white text-[16px] font-bold leading-none text-blue transition-colors hover:border-blue hover:bg-blueUltraLight disabled:opacity-40"
              >
                {addChildUi.activeParentId === node.id ? "−" : "+"}
              </button>
            ) : null}
          </div>
          {addChildUi && level === 0 && addChildUi.activeParentId === node.id ? (
            <div className="mb-1 mt-1.5 space-y-2 rounded-lg border border-blueExtraLight bg-white px-2.5 py-2.5 ms-1">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-blueSteel">
                Новая подкатегория
                <input
                  type="text"
                  value={addChildUi.draftName}
                  onChange={(e) => addChildUi.onDraftNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChildUi.onSubmit(node.id);
                    }
                  }}
                  placeholder="Название на витрине"
                  disabled={addChildUi.pending}
                  className="mt-1 w-full rounded-md border border-blueExtraLight bg-blueUltraLight/40 px-2 py-1.5 text-[13px] font-medium text-blueNavy outline-none placeholder:text-blueSteel focus:border-blue"
                />
              </label>
              {addChildUi.error ? (
                <p className="text-[11px] font-medium text-red-600" role="alert">
                  {addChildUi.error}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={addChildUi.pending || !addChildUi.draftName.trim()}
                  onClick={() => addChildUi.onSubmit(node.id)}
                  className="inline-flex items-center justify-center rounded-md bg-blue px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-40"
                >
                  {addChildUi.pending ? "Создание…" : "Добавить в каталог"}
                </button>
                <button
                  type="button"
                  disabled={addChildUi.pending}
                  onClick={addChildUi.onClose}
                  className="inline-flex items-center justify-center rounded-md border border-blueExtraLight bg-white px-3 py-1.5 text-[11px] font-bold text-blueNavy hover:bg-blueUltraLight disabled:opacity-40"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : null}
          {node.children.length > 0 ? (
            <MpBranch
              nodes={node.children}
              level={level + 1}
              selectedIds={selectedIds}
              onToggleMp={onToggleMp}
              searchActive={searchActive}
              addChildUi={addChildUi}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function selectionsFromSources(list: SourceMappingRowDTO[]): Record<string, string[]> {
  return Object.fromEntries(list.map((s) => [s.id, [...s.mappedMarketplaceCategoryIds]]));
}

/** id рубрики витрины → отображаемое имя (для подписи под категорией выгрузки). */
function mpCategoryNamesById(nodes: MpTreeNodeDTO[]): Map<string, string> {
  const map = new Map<string, string>();
  function walk(list: MpTreeNodeDTO[]) {
    for (const n of list) {
      map.set(n.id, n.name);
      if (n.children.length > 0) walk(n.children);
    }
  }
  walk(nodes);
  return map;
}

function mappedMpLabelsLine(ids: string[], nameById: Map<string, string>): string {
  if (ids.length === 0) return "";
  const names: string[] = [];
  let missing = 0;
  for (const id of ids) {
    const n = nameById.get(id)?.trim();
    if (n) names.push(n);
    else missing += 1;
  }
  names.sort((a, b) => a.localeCompare(b, "ru"));
  const missingNote =
    missing === 0
      ? ""
      : missing === 1
        ? " (1 рубрика не найдена в дереве каталога)"
        : ` (${missing} рубрик не найдено в дереве каталога)`;
  if (names.length === 0) {
    return missing === 1 ? "1 рубрика не найдена в дереве каталога" : `${missing} рубрик не найдено в дереве каталога`;
  }
  return names.join(", ") + missingNote;
}

export function StoreCategoryMappingPanel({
  storeId,
  sources,
  sourcesFingerprint,
  mpTree,
}: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [selections, setSelections] = useState<Record<string, string[]>>(() =>
    selectionsFromSources(sources),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [pickerSourceId, setPickerSourceId] = useState<string | null>(null);
  const [pickerDraft, setPickerDraft] = useState<string[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [addChildParentId, setAddChildParentId] = useState<string | null>(null);
  const [addChildName, setAddChildName] = useState("");
  const [addChildError, setAddChildError] = useState<string | null>(null);
  const [addChildSubmitting, setAddChildSubmitting] = useState(false);
  const pickerTitleId = useId();
  const pickerDescId = useId();
  const pickerSearchId = useId();

  useEffect(() => {
    setSelections(selectionsFromSources(sources));
    setSaveError(null);
  }, [sourcesFingerprint, sources]);

  const baseline = useMemo(
    () => selectionsFromSources(sources),
    [sourcesFingerprint, sources],
  );

  const dirty = useMemo(() => {
    for (const s of sources) {
      const a = [...(selections[s.id] ?? [])].sort().join("\0");
      const b = [...(baseline[s.id] ?? [])].sort().join("\0");
      if (a !== b) return true;
    }
    return false;
  }, [sources, selections, baseline]);

  const counts = useMemo(() => {
    const all = sources.length;
    const mapped = sources.filter((s) => (selections[s.id] ?? []).length > 0).length;
    const unmapped = all - mapped;
    return { all, mapped, unmapped };
  }, [sources, selections]);

  /** Список категорий выгрузки с учётом вкладок «Все / С привязкой / Без привязки». */
  const visibleSources = useMemo(() => {
    return sources.filter((sc) => {
      const hasMap = (selections[sc.id] ?? []).length > 0;
      if (filter === "all") return true;
      if (filter === "mapped") return hasMap;
      return !hasMap;
    });
  }, [sources, selections, filter]);

  const pickerSource = useMemo(
    () => (pickerSourceId ? sources.find((s) => s.id === pickerSourceId) : null),
    [pickerSourceId, sources],
  );

  const filteredMpTree = useMemo(
    () => filterMpTreeForPicker(mpTree, pickerSearch),
    [mpTree, pickerSearch],
  );

  const mpCategoryNameById = useMemo(() => mpCategoryNamesById(mpTree), [mpTree]);

  const pickerSearchActive = pickerSearch.trim().length > 0;

  const openPicker = useCallback((sourceId: string) => {
    setPickerSourceId(sourceId);
    setPickerDraft([...(selections[sourceId] ?? [])]);
    setPickerSearch("");
    setAddChildParentId(null);
    setAddChildName("");
    setAddChildError(null);
  }, [selections]);

  const closePicker = useCallback(() => {
    setPickerSourceId(null);
    setPickerSearch("");
    setAddChildParentId(null);
    setAddChildName("");
    setAddChildError(null);
  }, []);

  const applyPicker = useCallback(() => {
    if (!pickerSourceId) return;
    setSelections((prev) => ({
      ...prev,
      [pickerSourceId]: Array.from(new Set(pickerDraft)),
    }));
    setPickerSourceId(null);
    setPickerSearch("");
    setAddChildParentId(null);
    setAddChildName("");
    setAddChildError(null);
  }, [pickerSourceId, pickerDraft]);

  const togglePickerDraft = useCallback((mpId: string, checked: boolean) => {
    setPickerDraft((prev) => {
      const cur = new Set(prev);
      if (checked) cur.add(mpId);
      else cur.delete(mpId);
      return Array.from(cur);
    });
  }, []);

  const submitAddChild = useCallback(
    async (parentMarketplaceCategoryId: string) => {
      const name = addChildName.trim();
      if (!name) {
        setAddChildError("Введите название подкатегории");
        return;
      }
      setAddChildSubmitting(true);
      setAddChildError(null);
      try {
        const res = await createMarketplaceSubcategory(storeId, parentMarketplaceCategoryId, name);
        if (res.ok) {
          setPickerDraft((prev) =>
            prev.includes(res.category.id) ? prev : [...prev, res.category.id],
          );
          setAddChildParentId(null);
          setAddChildName("");
          router.refresh();
        } else {
          setAddChildError(res.error);
        }
      } finally {
        setAddChildSubmitting(false);
      }
    },
    [storeId, addChildName, router],
  );

  useEffect(() => {
    if (!pickerSourceId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePicker();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [pickerSourceId, closePicker]);

  function pill(key: Filter, label: string, count: number) {
    const active = filter === key;
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => setFilter(key)}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-bold transition-colors ${
          active
            ? "border-blue bg-blueUltraLight text-blueNavy shadow-sm"
            : "border-blueExtraLight bg-white text-blueNavy hover:border-blue"
        }`}
      >
        {label}
        <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums text-blueSteel">
          {count}
        </span>
      </button>
    );
  }

  function save() {
    setSaveError(null);
    const rows: CategoryMappingRowInput[] = sources.map((s) => ({
      sourceCategoryId: s.id,
      marketplaceCategoryIds: selections[s.id] ?? [],
    }));
    startTransition(async () => {
      const res = await saveAllStoreCategoryMappings(storeId, rows);
      if (res.ok) {
        router.refresh();
      } else {
        setSaveError(res.error);
      }
    });
  }

  if (sources.length === 0) {
    return (
      <div className="rounded-xl border border-blueExtraLight bg-blueUltraLight/50 px-4 py-6 text-sm text-blueSteel">
        Категорий из выгрузки пока нет. Укажите URL XML в настройках магазина и выполните выгрузку.
      </div>
    );
  }

  const pickerDraftSet = new Set(pickerDraft);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Фильтр списка категорий выгрузки">
          {pill("all", "Все", counts.all)}
          {pill("mapped", "С привязкой", counts.mapped)}
          {pill("unmapped", "Без привязки", counts.unmapped)}
        </div>
      </div>

      <div
        className="flex flex-col gap-3"
        role="tabpanel"
        aria-label={
          filter === "all"
            ? "Все категории выгрузки"
            : filter === "mapped"
              ? "Категории с привязкой"
              : "Категории без привязки"
        }
      >
        {visibleSources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-blueExtraLight bg-blueUltraLight/40 px-4 py-10 text-center text-[13px] font-medium text-blueSteel">
            {filter === "mapped"
              ? "Нет категорий с привязкой к витрине. Переключите фильтр или отметьте рубрики у категорий выгрузки."
              : filter === "unmapped"
                ? "Все категории выгрузки уже с привязкой."
                : "Категорий нет."}
          </div>
        ) : (
          visibleSources.map((sc) => {
            const ids = selections[sc.id] ?? [];
            const hasMap = ids.length > 0;
            return (
              <article
                key={sc.id}
                className="rounded-xl border border-blueExtraLight bg-white p-4 shadow-sm shadow-[#3458820f] sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold leading-snug text-blueNavy">{sc.name}</p>
                  {hasMap ? (
                    <p className="mt-1.5 text-[11px] leading-snug text-emerald-800">
                      <span className="font-semibold">Рубрики витрины: </span>
                      <span className="font-medium text-blueNavy">
                        {mappedMpLabelsLine(ids, mpCategoryNameById)}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11px] font-semibold text-red-700">Нет привязки</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openPicker(sc.id)}
                  className="mt-3 inline-flex w-full shrink-0 items-center justify-center rounded-lg border border-blue bg-white px-4 py-2.5 text-[12px] font-bold text-blue transition-colors hover:bg-blueUltraLight sm:mt-0 sm:w-auto"
                >
                  Выбрать категории
                </button>
              </article>
            );
          })
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-blueExtraLight pt-6 sm:flex-row sm:items-center sm:justify-between">
        {saveError ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {saveError}
          </p>
        ) : (
          <span className="hidden text-sm text-blueSteel sm:inline">
            {dirty ? "Есть несохранённые изменения." : "Изменений нет."}
          </span>
        )}
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() => save()}
          className="inline-flex w-full items-center justify-center rounded-xl border border-blue bg-blue px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-40 sm:ms-auto sm:w-auto sm:min-w-[200px]"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
      </div>

      {pickerSource && pickerSourceId ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-blueNavy/40 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={closePicker}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={pickerTitleId}
            aria-describedby={pickerDescId}
            className="flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col rounded-2xl border border-blueExtraLight bg-white shadow-lg shadow-[#3458821a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-blueExtraLight px-5 py-4">
              <h2 id={pickerTitleId} className="text-base font-extrabold text-blueNavy">
                Рубрики витрины
              </h2>
              <p id={pickerDescId} className="mt-1 text-sm text-blueSteel">
                Категория выгрузки:{" "}
                <span className="font-semibold text-blueNavy">{pickerSource.name}</span>
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-blueSteel">
                Отметьте одну или несколько рубрик каталога. У корневой рубрики можно нажать «+» и добавить подкатегорию
                (2-й уровень) — она сразу попадёт в каталог. Подтвердите «Готово» — затем нажмите «Сохранить» внизу
                страницы, чтобы записать все привязки в базу.
              </p>
            </div>
            <div className="shrink-0 border-b border-blueExtraLight px-5 pb-3 pt-1">
              <label htmlFor={pickerSearchId} className="mb-1.5 block text-[11px] font-bold text-blueNavy">
                Поиск по рубрикам
              </label>
              <input
                id={pickerSearchId}
                type="search"
                autoComplete="off"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Название или slug…"
                className={pickerSearchInputClass}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [-webkit-overflow-scrolling:touch]">
              {filteredMpTree.length === 0 ? (
                <p className="py-6 text-center text-[13px] font-medium text-blueSteel">
                  {pickerSearchActive
                    ? "Ничего не найдено. Измените запрос."
                    : "Рубрик каталога нет."}
                </p>
              ) : (
                <MpBranch
                  nodes={filteredMpTree}
                  level={0}
                  selectedIds={pickerDraftSet}
                  onToggleMp={togglePickerDraft}
                  searchActive={pickerSearchActive}
                  addChildUi={{
                    activeParentId: addChildParentId,
                    draftName: addChildName,
                    onDraftNameChange: setAddChildName,
                    onOpen: (parentId) => {
                      setAddChildParentId(parentId);
                      setAddChildName("");
                      setAddChildError(null);
                    },
                    onClose: () => {
                      setAddChildParentId(null);
                      setAddChildName("");
                      setAddChildError(null);
                    },
                    onSubmit: submitAddChild,
                    pending: addChildSubmitting,
                    error: addChildError,
                  }}
                />
              )}
            </div>
            <div className="flex flex-col gap-2 border-t border-blueExtraLight px-5 py-4 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={closePicker}
                className="inline-flex w-full items-center justify-center rounded-xl border border-blueExtraLight bg-white px-4 py-2.5 text-sm font-bold text-blueNavy transition-colors hover:border-blue hover:bg-blueUltraLight sm:w-auto sm:min-w-[120px]"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={applyPicker}
                className="inline-flex w-full items-center justify-center rounded-xl border border-blue bg-blue px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-95 sm:w-auto sm:min-w-[140px]"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
