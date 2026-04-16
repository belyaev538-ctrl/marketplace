export default function CatalogLoading() {
  return (
    <div className="min-h-full bg-white pb-10">
      <div className="mx-auto w-full max-w-[1385px] px-[15px] pt-5">
        <div className="animate-pulse rounded-[15px] border border-blueExtraLight bg-white p-4 md:p-6">
          <div className="h-4 w-36 rounded bg-blueUltraLight" />
          <div className="mt-4 h-11 w-full rounded-xl bg-blueUltraLight" />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1385px] px-[15px] pt-[18px] pb-[30px] md:pb-[50px]">
        <div className="animate-pulse">
          <div className="h-4 w-40 rounded bg-blueUltraLight" />
          <div className="mt-4 h-8 w-56 rounded bg-blueUltraLight" />
        </div>

        <div className="mt-5 flex w-full flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:gap-[25px]">
          <aside className="hidden min-w-[205px] max-w-[205px] shrink-0 flex-col gap-3 lg:flex">
            <div className="animate-pulse space-y-3">
              <div className="h-6 w-full rounded bg-blueUltraLight" />
              <div className="h-6 w-[85%] rounded bg-blueUltraLight" />
              <div className="h-6 w-[90%] rounded bg-blueUltraLight" />
              <div className="h-28 w-full rounded-xl bg-blueUltraLight" />
              <div className="h-10 w-full rounded-md bg-blueUltraLight" />
              <div className="h-10 w-full rounded-md bg-blueUltraLight" />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-4 hidden h-[58px] items-center justify-between border-b border-graySoft pb-[15px] lg:flex">
              <div className="h-4 w-28 animate-pulse rounded bg-blueUltraLight" />
              <div className="h-10 w-[158px] animate-pulse rounded-md bg-blueUltraLight" />
            </div>

            <div className="grid grid-cols-2 gap-[15px] gap-y-[12px] md:grid-cols-3 md:gap-x-[25px] md:gap-y-5 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, idx) => (
                <article
                  key={idx}
                  className="animate-pulse rounded-xl rounded-br-none border border-blueExtraLight bg-white p-3 md:px-[15px] md:pt-[15px] md:pb-5"
                >
                  <div className="h-[18px] w-2/3 rounded bg-blueUltraLight" />
                  <div className="mt-3 h-[186px] rounded-[10px] bg-blueUltraLight md:h-[231px]" />
                  <div className="mt-3 h-4 w-[90%] rounded bg-blueUltraLight" />
                  <div className="mt-2 h-4 w-[70%] rounded bg-blueUltraLight" />
                  <div className="mt-4 flex items-center justify-between">
                    <div className="h-5 w-24 rounded bg-blueUltraLight" />
                    <div className="h-[42px] w-[42px] rounded-[15px] rounded-br-none bg-blueUltraLight md:h-[45px] md:w-[45px]" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
