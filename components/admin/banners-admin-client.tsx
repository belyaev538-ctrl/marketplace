"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  createHomeBanner,
  deleteHomeBanner,
  toggleHomeBannerActive,
  updateHomeBanner,
} from "@/app/admin/banners/actions";

export type AdminBannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
  linkUrl: string | null;
};

const fieldClass =
  "w-full rounded-md border border-blueExtraLight bg-blueUltraLight py-2 ps-2.5 pe-2 text-[13px] font-medium text-blueNavy outline-none focus:border-blueLight";

type Props = {
  initialBanners: AdminBannerRow[];
};

export function BannersAdminClient({ initialBanners }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const onAdd = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setMessage(null);
      const form = e.currentTarget;
      const fd = new FormData(form);
      const file = fd.get("file");
      if (!(file instanceof File) || file.size === 0) {
        setMessage("Выберите файл изображения");
        return;
      }

      const up = new FormData();
      up.append("file", file);

      try {
        const res = await fetch("/api/admin/banners/upload", {
          method: "POST",
          body: up,
        });
        const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
        if (!res.ok || !data.url) {
          setMessage(data.error ?? "Ошибка загрузки");
          return;
        }

        const createFd = new FormData();
        createFd.set("title", String(fd.get("title") ?? "").trim());
        createFd.set("subtitle", String(fd.get("subtitle") ?? ""));
        createFd.set("linkUrl", String(fd.get("linkUrl") ?? ""));
        createFd.set("imageUrl", data.url);

        startTransition(async () => {
          const out = await createHomeBanner(createFd);
          if (!out.ok) {
            setMessage(out.error);
            return;
          }
          form.reset();
          refresh();
        });
      } catch {
        setMessage("Сеть или сервер недоступны");
      }
    },
    [refresh],
  );

  return (
    <div className="flex flex-col gap-10">
      {message ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {message}
        </p>
      ) : null}

      <section className="rounded-xl border border-blueExtraLight bg-white p-5 shadow-sm shadow-[#34588212]">
        <h2 className="text-lg font-extrabold text-blueNavy">Добавить баннер</h2>
        <p className="mt-1 text-xs text-blueSteel">
          JPEG, PNG или WebP до 5 МБ. После загрузки баннер попадёт в конец очереди.
        </p>
        <form className="mt-4 flex flex-col gap-3" onSubmit={onAdd}>
          <div>
            <label className="mb-1 block text-[12px] font-bold text-blueNavy">Заголовок</label>
            <input name="title" required className={fieldClass} placeholder="Текст на слайде" />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-bold text-blueNavy">
              Подзаголовок (необязательно)
            </label>
            <textarea
              name="subtitle"
              rows={3}
              className={`${fieldClass} min-h-[72px] resize-y`}
              placeholder="Если пусто — на главной покажется стандартный текст акции"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-bold text-blueNavy">
              Ссылка по клику (необязательно)
            </label>
            <input name="linkUrl" type="url" className={fieldClass} placeholder="https://…" />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-bold text-blueNavy">Файл изображения</label>
            <input
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="block w-full text-[13px] text-blueNavy file:mr-3 file:rounded-md file:border-0 file:bg-blue file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-blue py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-50 sm:w-auto sm:min-w-[180px]"
          >
            {pending ? "Сохранение…" : "Загрузить и добавить"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-extrabold text-blueNavy">Текущие баннеры</h2>
        <p className="mt-1 text-xs text-blueSteel">
          Превью, очередь (sort), включение. Сохраняйте изменения по кнопке у каждой карточки.
        </p>

        {initialBanners.length === 0 ? (
          <p className="mt-6 text-sm text-blueSteel">
            В базе пока нет записей — добавьте баннер выше или выполните{" "}
            <code className="rounded bg-blueUltraLight px-1">npx prisma db seed</code> (два демо-слайда
            из <code className="rounded bg-blueUltraLight px-1">/mlavka/img/</code>).
          </p>
        ) : (
          <ul className="mt-6 flex flex-col gap-6">
            {initialBanners.map((b) => (
              <li
                key={b.id}
                className={`overflow-hidden rounded-xl border border-blueExtraLight bg-white shadow-sm shadow-[#34588212] ${
                  b.active ? "" : "opacity-70 ring-2 ring-dashed ring-blueExtraLight"
                }`}
              >
                <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,280px)_1fr] md:items-start">
                  <div className="relative aspect-[21/9] w-full max-w-md overflow-hidden rounded-lg bg-blueUltraLight">
                    <Image
                      src={b.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="280px"
                      unoptimized={b.imageUrl.startsWith("/uploads/")}
                    />
                    <span
                      className={`absolute left-2 top-2 rounded px-2 py-0.5 text-[10px] font-bold ${
                        b.active ? "bg-emerald-600 text-white" : "bg-blueSteel/80 text-white"
                      }`}
                    >
                      {b.active ? "Вкл" : "Выкл"}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-col gap-3">
                    <form
                      className="flex flex-col gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        setMessage(null);
                        const fd = new FormData(e.currentTarget);
                        startTransition(async () => {
                          const out = await updateHomeBanner(fd);
                          if (!out.ok) setMessage(out.error);
                          else refresh();
                        });
                      }}
                    >
                      <input type="hidden" name="id" value={b.id} />
                      <div>
                        <label className="mb-0.5 block text-[11px] font-bold text-blueSteel">
                          Заголовок
                        </label>
                        <input
                          name="title"
                          defaultValue={b.title}
                          required
                          className={fieldClass}
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[11px] font-bold text-blueSteel">
                          Подзаголовок
                        </label>
                        <textarea
                          name="subtitle"
                          rows={2}
                          defaultValue={b.subtitle ?? ""}
                          className={`${fieldClass} min-h-[56px] resize-y`}
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[11px] font-bold text-blueSteel">
                          Ссылка
                        </label>
                        <input
                          name="linkUrl"
                          type="url"
                          defaultValue={b.linkUrl ?? ""}
                          className={fieldClass}
                          placeholder="https://…"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[11px] font-bold text-blueSteel">
                          Очередь (меньше — раньше)
                        </label>
                        <input
                          name="sortOrder"
                          type="number"
                          min={0}
                          defaultValue={b.sortOrder}
                          className={`${fieldClass} max-w-[120px]`}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={pending}
                          className="rounded-lg bg-blue px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setMessage(null);
                            startTransition(async () => {
                              const out = await toggleHomeBannerActive(b.id);
                              if (!out.ok) setMessage(out.error);
                              else refresh();
                            });
                          }}
                          className="rounded-lg border border-blueExtraLight bg-white px-4 py-2 text-xs font-bold text-blueNavy hover:bg-blueUltraLight disabled:opacity-50"
                        >
                          {b.active ? "Выключить" : "Включить"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            if (!confirm(`Удалить баннер «${b.title}»?`)) return;
                            setMessage(null);
                            startTransition(async () => {
                              const out = await deleteHomeBanner(b.id);
                              if (!out.ok) setMessage(out.error);
                              else refresh();
                            });
                          }}
                          className="rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Удалить
                        </button>
                      </div>
                    </form>
                    <p className="break-all text-[11px] text-blueSteel">
                      <span className="font-semibold text-blueNavy">Путь: </span>
                      {b.imageUrl}
                      {b.imageUrl.startsWith("/mlavka/") ? (
                        <span className="ml-1 text-blueSteel">
                          (статика в репозитории; замените файл в{" "}
                          <code className="rounded bg-blueUltraLight px-0.5">public</code> или удалите
                          баннер и загрузите новый)
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-blueSteel">
        Главная:{" "}
        <Link href="/" className="font-semibold text-blue underline-offset-2 hover:underline">
          открыть сайт
        </Link>
      </p>
    </div>
  );
}
