import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { StoreCategoryMappingPanel } from "@/components/admin/store-category-mapping-panel";
import { authOptions } from "@/lib/auth/options";
import { buildMarketplaceCategoryTree } from "@/lib/marketplace-category-tree";
import { prisma } from "@/lib/prisma";

type Props = { params: { id: string } };

export default async function StoreCategoryMappingPage({ params }: Props) {
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
    select: { id: true },
  });
  if (!store) {
    notFound();
  }

  const [sourceCategories, mpRows] = await Promise.all([
    prisma.sourceCategory.findMany({
      where: { storeId: store.id },
      orderBy: [{ name: "asc" }],
      include: {
        mappings: {
          select: { marketplaceCategoryId: true },
        },
      },
    }),
    prisma.marketplaceCategory.findMany({
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, slug: true, parentId: true },
    }),
  ]);

  const mpTree = buildMarketplaceCategoryTree(mpRows);

  const sources = sourceCategories.map((s) => ({
    id: s.id,
    externalId: s.externalId,
    name: s.name,
    mappedMarketplaceCategoryIds: s.mappings.map((m) => m.marketplaceCategoryId),
  }));

  const sourcesFingerprint = JSON.stringify(
    sources.map((s) => ({ id: s.id, m: s.mappedMarketplaceCategoryIds })),
  );

  return (
    <main className="min-h-0 w-full min-w-0 px-4 py-6 md:px-8 md:py-8">
      <div>
        <StoreCategoryMappingPanel
          storeId={store.id}
          sources={sources}
          sourcesFingerprint={sourcesFingerprint}
          mpTree={mpTree}
        />
      </div>
    </main>
  );
}
