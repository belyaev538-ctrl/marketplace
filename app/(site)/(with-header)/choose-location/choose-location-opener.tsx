"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useChooseLocation } from "@/components/choose-location-context";

/** Открывает модальное окно выбора точки и уводит с отдельного URL на главную. */
export function ChooseLocationOpener() {
  const { open } = useChooseLocation();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const rawReturnTo = (searchParams.get("returnTo") ?? "").trim();
    const safeReturnTo =
      rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("/choose-location")
        ? rawReturnTo
        : "/";
    open();
    router.replace(safeReturnTo, { scroll: false });
  }, [open, router, searchParams]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-blueSteel" aria-live="polite">
      Открываем выбор местоположения…
    </div>
  );
}
