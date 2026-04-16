import { Header } from "@/components/header";
import { StoresMapWithUserLocation } from "@/components/map/stores-map-with-user-location";
import { EmptyState } from "@/components/ui/empty-state";
import { catalogListableStoreWithCoordsWhere } from "@/lib/catalog-products-query";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const rows = await prisma.store.findMany({
    where: catalogListableStoreWithCoordsWhere(),
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      latitude: true,
      longitude: true,
    },
    orderBy: { name: "asc" },
  });

  const stores = rows
    .filter(
      (r) =>
        r.latitude != null &&
        r.longitude != null &&
        typeof r.latitude === "number" &&
        typeof r.longitude === "number" &&
        Number.isFinite(r.latitude) &&
        Number.isFinite(r.longitude) &&
        r.latitude >= -90 &&
        r.latitude <= 90 &&
        r.longitude >= -180 &&
        r.longitude <= 180,
    )
    .map((r) => ({
      name: r.name,
      slug: r.slug,
      logoUrl: r.logo?.trim() || null,
      latitude: r.latitude as number,
      longitude: r.longitude as number,
    }));

  if (stores.length === 0) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-8">
          <h1 className="text-xl font-extrabold text-blueNavy">Карта магазинов</h1>
          <EmptyState className="mt-4" />
        </main>
      </>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full max-w-none flex-col overflow-hidden bg-white">
      <Header />
      <main className="relative flex min-h-0 w-full flex-1 flex-col">
        <StoresMapWithUserLocation
          stores={stores}
          fill
          productCardStyle
          filterStoresInSearchRadius
        />
      </main>
    </div>
  );
}
