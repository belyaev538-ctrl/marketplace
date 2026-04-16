"use client";

type Props = {
  storeLatitude: number | null;
  storeLongitude: number | null;
  className?: string;
};

export function StoreDistanceBadge({ className }: Props) {
  return (
    <div
      className={
        className ??
        "relative isolate flex h-[45px] min-h-[45px] w-[185px] min-w-[185px] flex-none overflow-hidden rounded-xl rounded-br-none"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon/rasstoyanie.svg"
        alt=""
        width={189}
        height={45}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain object-center"
      />
      <span className="relative z-[1] flex h-full w-full items-center justify-center px-2 text-center text-[11px] font-semibold leading-tight text-blueNavy">
        От вас ≈ ХХ км.
      </span>
    </div>
  );
}

