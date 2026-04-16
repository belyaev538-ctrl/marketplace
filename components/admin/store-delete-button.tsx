"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { deleteStore } from "@/app/admin/stores/actions";

type Props = {
  storeId: string;
  storeName: string;
};

export function StoreDeleteButton({ storeId, storeName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descId = useId();

  function confirmDelete() {
    if (pending) return;
    startTransition(async () => {
      const res = await deleteStore(storeId);
      if (res.ok) {
        setOpen(false);
        router.push("/admin/stores");
        router.refresh();
      } else {
        alert(`Не удалось удалить: ${res.error}`);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-[34px] items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
      >
        Удалить магазин
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-blueNavy/40 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => (pending ? undefined : setOpen(false))}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="w-full max-w-md rounded-2xl border border-blueExtraLight bg-white p-6 shadow-lg shadow-[#3458821a]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId} className="text-lg font-extrabold text-blueNavy">
              Удалить магазин?
            </h2>
            <p id={descId} className="mt-3 text-sm leading-relaxed text-blueSteel">
              Магазин «<span className="font-semibold text-blueNavy">{storeName}</span>» будет удалён вместе с
              товарами и связанными данными. Отменить это действие будет нельзя.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
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
    </>
  );
}
