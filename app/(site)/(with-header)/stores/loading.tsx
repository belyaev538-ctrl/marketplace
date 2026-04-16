export default function StoresLoading() {
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
          <div className="h-4 w-32 rounded bg-blueUltraLight" />
          <div className="mt-4 h-8 w-64 rounded bg-blueUltraLight" />
        </div>

        <div className="mt-5 flex w-full flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:gap-[25px]">
          <aside className="hidden min-w-[205px] max-w-[205px] shrink-0 flex-col gap-3 lg:flex">
            <div className="animate-pulse space-y-3">
              <div className="h-6 w-full rounded bg-blueUltraLight" />
              <div className="h-6 w-[88%] rounded bg-blueUltraLight" />
              <div className="h-6 w-[82%] rounded bg-blueUltraLight" />
              <div className="h-24 w-full rounded-xl bg-blueUltraLight" />
              <div className="h-10 w-full rounded-md bg-blueUltraLight" />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-4 hidden h-[58px] items-center border-b border-graySoft pb-[15px] lg:flex">
              <div className="h-4 w-28 animate-pulse rounded bg-blueUltraLight" />
            </div>

            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, idx) => (
                <article
                  key={idx}
                  className="animate-pulse rounded-xl border border-blueExtraLight bg-white p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-5">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="h-[45px] w-[130px] rounded-md bg-blueUltraLight" />
                        <div className="min-w-0 flex-1">
                          <div className="h-3 w-16 rounded bg-blueUltraLight" />
                          <div className="mt-2 h-6 w-1/2 rounded bg-blueUltraLight" />
                        </div>
                      </div>
                      <div className="h-4 w-32 rounded bg-blueUltraLight" />
                      <div className="mt-2 h-4 w-3/4 rounded bg-blueUltraLight" />
                      <div className="mt-3 flex gap-2">
                        <div className="h-8 w-24 rounded-full rounded-br-none bg-blueUltraLight" />
                        <div className="h-8 w-28 rounded-full rounded-br-none bg-blueUltraLight" />
                      </div>
                    </div>
                    <div className="hidden w-px bg-[#e3e9f1] md:block" />
                    <div className="flex shrink-0 flex-col gap-2 md:min-w-[240px]">
                      <div className="h-10 w-40 rounded-md bg-blueUltraLight" />
                      <div className="h-10 w-44 rounded-md bg-blueUltraLight" />
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <div className="h-[42px] rounded-md bg-blueUltraLight" />
                        <div className="h-[42px] rounded-md bg-blueUltraLight" />
                      </div>
                    </div>
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
