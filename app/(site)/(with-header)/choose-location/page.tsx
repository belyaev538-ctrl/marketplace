import type { Metadata } from "next";
import { Suspense } from "react";
import { ChooseLocationOpener } from "./choose-location-opener";

export const metadata: Metadata = {
  title: "Мое местоположение на карте",
};

function ChooseLocationFallback() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-blueSteel" aria-live="polite">
      Открываем выбор местоположения…
    </div>
  );
}

export default function ChooseLocationPage() {
  return (
    <Suspense fallback={<ChooseLocationFallback />}>
      <ChooseLocationOpener />
    </Suspense>
  );
}
