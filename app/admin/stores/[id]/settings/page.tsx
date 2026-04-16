import { ImportStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { AdminStoreForm } from "@/components/admin/admin-store-form";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { formatWorkingHoursHuman } from "@/lib/store-display";
import { updateStore } from "../../actions";

type Props = {
  params: { id: string };
  searchParams?: { saved?: string | string[] };
};

function truncateImportError120(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (t.length <= 120) return t;
  return `${t.slice(0, 117)}…`;
}

export default async function StoreSettingsPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/login");
  }

  const id = params.id?.trim();
  if (!id) {
    notFound();
  }

  const store = await prisma.store.findUnique({ where: { id } });
  if (!store) {
    notFound();
  }

  return (
    <main className="min-h-0 w-full min-w-0">
      <div className="w-full min-w-0 bg-white px-4 py-6 md:px-8 md:py-8">
        <div className="w-full min-w-0 space-y-2 rounded-lg bg-blueUltraLight/60 px-4 py-3 text-[13px] text-blueNavy">
          {!store.xmlUrl?.trim() ? (
            <p className="font-medium text-blueSteel">
              <span aria-hidden className="me-1">
                ⓘ
              </span>
              Нет XML URL — в списке магазинов кнопка «Выгрузить сейчас» недоступна.
            </p>
          ) : null}
          {!store.autoImport ? (
            <p className="font-medium text-blueSteel">Автоимпорт выключен</p>
          ) : (
            <p className="font-medium text-blueSteel">
              Автоимпорт включён: раз в сутки в начале{" "}
              <span className="font-bold tabular-nums text-blueNavy">
                {String(store.autoImportHourUtc).padStart(2, "0")}:00
              </span>{" "}
              UTC (см. поле ниже).
            </p>
          )}
          {store.lastImportStatus === ImportStatus.failed ? (
            <p className="font-semibold text-red-700">
              <span aria-hidden className="me-1">
                ⚠
              </span>
              Последняя выгрузка завершилась с ошибкой
              {truncateImportError120(store.lastImportError)
                ? `: ${truncateImportError120(store.lastImportError)}`
                : "."}
            </p>
          ) : null}
        </div>

        <div className="mt-6 w-full min-w-0">
          <AdminStoreForm
            key={store.id}
            action={updateStore}
            storeId={store.id}
            savedNotice={searchParams?.saved === "1"}
            cancelHref="/admin/stores"
            submitLabel="Сохранить изменения"
            defaults={{
              name: store.name,
              slug: store.slug,
              logo: store.logo,
              shortDescription: store.shortDescription,
              fullDescription: store.fullDescription,
              workDescription: store.workDescription,
              xmlUrl: store.xmlUrl,
              fallbackUrl: store.fallbackUrl,
              website: store.website,
              vkUrl: store.vkUrl,
              telegramUrl: store.telegramUrl,
              whatsappUrl: store.whatsappUrl,
              otherMessengerUrl: store.otherMessengerUrl,
              businessTypes: store.businessTypes,
              phone: store.phone,
              address: store.address,
              latitude: store.latitude,
              longitude: store.longitude,
              storeType: store.storeType,
              fulfillmentModes: store.fulfillmentModes,
              active: store.active,
              showProducts: store.showProducts,
              autoImport: store.autoImport,
              autoImportHourUtc: store.autoImportHourUtc,
              workingHours: formatWorkingHoursHuman(store.workingHours) ?? "",
            }}
          />
        </div>
      </div>
    </main>
  );
}
