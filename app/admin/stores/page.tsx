import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AdminStoresList } from "@/components/admin/admin-stores-list";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";

export default async function AdminStoresPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/login");
  }

  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "desc" },
  });

  const rows = await Promise.all(
    stores.map(async (store) => {
      const [productCount, sourceCategoryCount, unmappedCount, anyMapping] =
        await Promise.all([
          prisma.product.count({ where: { storeId: store.id } }),
          prisma.sourceCategory.count({ where: { storeId: store.id } }),
          prisma.sourceCategory.count({
            where: {
              storeId: store.id,
              mappings: { none: {} },
            },
          }),
          prisma.categoryMapping.findFirst({
            where: { storeId: store.id },
            select: { id: true },
          }),
        ]);
      return {
        id: store.id,
        name: store.name,
        logo: store.logo?.trim() || null,
        active: store.active,
        showProducts: store.showProducts,
        lastImportAt: store.lastImportAt?.toISOString() ?? null,
        lastImportStatus: store.lastImportStatus ?? null,
        hasXmlUrl: Boolean(store.xmlUrl?.trim()),
        productCount,
        sourceCategoryCount,
        unmappedCount,
        hasMapping: anyMapping != null,
      };
    }),
  );

  return (
    <main className="min-h-0">
      <AdminStoresList rows={rows} />
    </main>
  );
}
