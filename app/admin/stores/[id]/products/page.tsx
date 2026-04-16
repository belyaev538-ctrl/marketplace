import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { firstSearchParam } from "@/lib/search-params";
import { prisma } from "@/lib/prisma";
import { StoreProductRow } from "../store-product-row";

const PAGE_SIZE = 30;

type Props = {
  params: { id: string };
  searchParams: { page?: string | string[] };
};

export default async function AdminStoreProductsPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/login");
  }

  const storeId = params.id?.trim();
  if (!storeId) {
    notFound();
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, name: true, slug: true },
  });

  if (!store) {
    notFound();
  }

  const pageRaw = firstSearchParam(searchParams.page);
  const pageParsed = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);

  const total = await prisma.product.count({ where: { storeId: store.id } });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageParsed, totalPages);

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    orderBy: { name: "asc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      name: true,
      active: true,
      images: {
        take: 1,
        orderBy: { id: "asc" },
        select: { url: true },
      },
      sourceCategory: {
        select: {
          name: true,
          mappings: {
            where: { storeId: store.id },
            select: {
              marketplaceCategory: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const basePath = `/admin/stores/${encodeURIComponent(store.id)}/products`;

  return (
    <main className="min-h-0 w-full min-w-0 px-4 py-6 md:px-8 md:py-8">
      <h2 className="text-lg font-extrabold text-blueNavy md:text-xl">Товары</h2>
      <p className="mt-1 text-sm text-blueSteel">
        Всего в базе:{" "}
        <span className="font-semibold tabular-nums text-blueNavy">{total}</span>
      </p>

      {products.length === 0 ? (
        <div className="mt-8 rounded-xl border border-blueExtraLight bg-blueUltraLight/50 px-4 py-6 text-sm text-blueSteel">
          В этом магазине пока нет товаров. Проверьте выгрузку XML и привязку категорий.
        </div>
      ) : (
        <div className="mt-6 w-full max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 border-b border-blueExtraLight pb-2 text-[11px] font-semibold uppercase tracking-wide text-blueSteel">
            <span className="w-[50px] shrink-0 sm:mr-1" aria-hidden>
              &nbsp;
            </span>
            <span className="min-w-0 flex-1">Товар и рубрики</span>
            <span className="shrink-0">На сайте</span>
          </div>
          <div>
            {products.map((p) => {
              const mpNames = Array.from(
                new Set(
                  (p.sourceCategory?.mappings ?? []).map((m) => m.marketplaceCategory.name),
                ),
              ).sort((a, b) => a.localeCompare(b, "ru"));
              return (
                <StoreProductRow
                  key={p.id}
                  productId={p.id}
                  storeId={store.id}
                  name={p.name}
                  imageUrl={p.images[0]?.url ?? null}
                  initialActive={p.active}
                  feedCategoryName={p.sourceCategory?.name ?? null}
                  marketplaceCategoryNames={mpNames}
                />
              );
            })}
          </div>
          {total > 0 ? (
            <div className="mt-6 flex flex-col gap-3 border-t border-blueExtraLight pt-4 text-sm text-blueSteel sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <span>
                Показано {from}–{to} из {total}
                {totalPages > 1 ? (
                  <span className="text-blueSteel/80">
                    {" "}
                    (стр. {page} из {totalPages})
                  </span>
                ) : null}
              </span>
              {totalPages > 1 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {page > 1 ? (
                    <Link
                      href={page === 2 ? basePath : `${basePath}?page=${page - 1}`}
                      className="rounded-lg border border-blueExtraLight bg-white px-3 py-1.5 font-semibold text-blue transition-colors hover:bg-blueUltraLight"
                    >
                      Назад
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-transparent px-3 py-1.5 text-blueSteel/50">
                      Назад
                    </span>
                  )}
                  {page < totalPages ? (
                    <Link
                      href={`${basePath}?page=${page + 1}`}
                      className="rounded-lg border border-blueExtraLight bg-white px-3 py-1.5 font-semibold text-blue transition-colors hover:bg-blueUltraLight"
                    >
                      Вперёд
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-transparent px-3 py-1.5 text-blueSteel/50">
                      Вперёд
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
