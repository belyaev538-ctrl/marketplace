import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BannersAdminClient } from "@/components/admin/banners-admin-client";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";

export default async function AdminBannersPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/login");
  }

  const banners = await prisma.homeBanner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <main className="min-h-0 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
        <p className="mb-2 text-sm text-blueSteel">
          <Link
            href="/admin/stores"
            className="font-medium text-blue underline-offset-2 hover:underline"
          >
            ← Админка
          </Link>
        </p>
        <h1 className="text-2xl font-extrabold text-blueNavy">Баннеры</h1>
        <p className="mt-1 max-w-2xl text-sm text-blueSteel">
          Слайдер на главной под блоком категорий. Включайте и выключайте слайды, меняйте очередь
          (меньшее число — раньше в карусели), загружайте новые картинки или используйте пути из{" "}
          <code className="rounded bg-blueUltraLight px-1 text-xs">/mlavka/img/…</code> вручную после
          добавления файла в проект.
        </p>

        <div className="mt-8">
          <BannersAdminClient
            initialBanners={banners.map((b) => ({
              id: b.id,
              title: b.title,
              subtitle: b.subtitle,
              imageUrl: b.imageUrl,
              sortOrder: b.sortOrder,
              active: b.active,
              linkUrl: b.linkUrl,
            }))}
          />
        </div>
      </div>
    </main>
  );
}
