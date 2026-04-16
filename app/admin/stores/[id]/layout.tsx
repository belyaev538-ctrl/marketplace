import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { StoreAdminTabs } from "@/components/admin/store-admin-tabs";
import { StoreDeleteButton } from "@/components/admin/store-delete-button";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";

type Props = {
  children: React.ReactNode;
  params: { id: string };
};

export default async function AdminStoreLayout({ children, params }: Props) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/login");
  }

  const id = params.id?.trim();
  if (!id) {
    notFound();
  }

  const store = await prisma.store.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!store) {
    notFound();
  }

  const unmappedCategoryCount = await prisma.sourceCategory.count({
    where: {
      storeId: store.id,
      NOT: { mappings: { some: {} } },
    },
  });

  return (
    <div className="min-h-0 w-full min-w-0">
      <header className="border-b border-blueExtraLight bg-white px-4 pt-6 md:px-8">
        <p className="text-sm text-blueSteel">
          <Link
            href="/admin/stores"
            className="font-medium text-blue underline-offset-2 hover:underline"
          >
            ← К списку магазинов
          </Link>
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[22px] font-extrabold text-blueNavy">{`Настройки магазина "${store.name}"`}</h1>
          <StoreDeleteButton storeId={store.id} storeName={store.name} />
        </div>
        <StoreAdminTabs storeId={store.id} unmappedCategoryCount={unmappedCategoryCount} />
      </header>
      {children}
    </div>
  );
}
