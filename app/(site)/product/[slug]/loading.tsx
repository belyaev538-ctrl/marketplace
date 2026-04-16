export default function ProductLoading() {
  return (
    <div className="flex min-h-0 w-full flex-col bg-white lg:min-h-[100dvh] lg:flex-row lg:items-stretch">
      <section className="flex min-h-0 w-full min-w-0 flex-1 flex-col border-blueExtraLight lg:max-w-[50%] lg:flex-none lg:basis-1/2 lg:border-r">
        <div className="mx-auto w-full max-w-[720px] px-[15px] pb-10 pt-4 md:pb-[50px] lg:mr-0 lg:max-w-none lg:pl-4 lg:pr-6 xl:pl-6 xl:pr-8">
          <div className="h-[39px] w-[39px] animate-pulse rounded-full bg-blueUltraLight" />
          <div className="mt-4 h-px w-full bg-[#B7C5D5]" />

          <div className="mt-4 h-8 w-3/4 animate-pulse rounded bg-blueUltraLight" />

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:gap-4">
            <div className="h-[320px] w-full animate-pulse rounded-xl bg-blueUltraLight md:max-w-[410px] md:flex-[0_1_410px]" />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="h-8 w-32 animate-pulse rounded bg-blueUltraLight" />
              <div className="h-16 w-full animate-pulse rounded-xl bg-blueUltraLight" />
              <div className="h-10 w-4/5 animate-pulse rounded-full rounded-br-none bg-blueUltraLight" />
              <div className="h-10 w-3/4 animate-pulse rounded-full rounded-br-none bg-blueUltraLight" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="h-[45px] animate-pulse rounded-xl rounded-br-none bg-blueUltraLight" />
            <div className="h-[45px] animate-pulse rounded-xl rounded-br-none bg-blueUltraLight" />
            <div className="h-[45px] animate-pulse rounded-xl rounded-br-none bg-blueUltraLight" />
          </div>

          <div className="mt-5 animate-pulse">
            <div className="h-5 w-24 rounded bg-blueUltraLight" />
            <div className="mt-2 h-4 w-full rounded bg-blueUltraLight" />
            <div className="mt-2 h-4 w-[92%] rounded bg-blueUltraLight" />
            <div className="mt-2 h-4 w-[70%] rounded bg-blueUltraLight" />
          </div>

          <div className="mt-7">
            <div className="mb-3 h-5 w-40 animate-pulse rounded bg-blueUltraLight" />
            <div className="grid grid-cols-3 gap-[15px] gap-y-[12px]">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="animate-pulse rounded-xl rounded-br-none border border-blueExtraLight p-3">
                  <div className="h-3 w-2/3 rounded bg-blueUltraLight" />
                  <div className="mt-3 h-[140px] rounded-[10px] bg-blueUltraLight" />
                  <div className="mt-3 h-4 w-[85%] rounded bg-blueUltraLight" />
                  <div className="mt-2 h-4 w-[60%] rounded bg-blueUltraLight" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex w-full min-w-0 flex-1 flex-col lg:max-w-[50%] lg:flex-none lg:basis-1/2">
        <div className="relative flex min-h-[280px] w-full flex-1 animate-pulse bg-blueUltraLight lg:min-h-[100dvh]" />
      </div>
    </div>
  );
}
