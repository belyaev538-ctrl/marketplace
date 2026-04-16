"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { setProductActive } from "./actions";

type Props = {
  productId: string;
  storeId: string;
  initialActive: boolean;
};

export function ProductActiveToggle({ productId, storeId, initialActive }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setActive(initialActive);
  }, [initialActive]);

  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-400"
        checked={active}
        disabled={busy}
        onChange={async (e) => {
          const next = e.target.checked;
          const prev = active;
          setActive(next);
          setBusy(true);
          try {
            await setProductActive(productId, storeId, next);
            router.refresh();
          } catch {
            setActive(prev);
          } finally {
            setBusy(false);
          }
        }}
      />
      <span className="text-sm text-gray-700">{active ? "Активен" : "Выключен"}</span>
    </label>
  );
}
