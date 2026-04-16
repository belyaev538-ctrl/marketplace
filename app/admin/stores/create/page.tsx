import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AdminStoreForm } from "@/components/admin/admin-store-form";
import { authOptions } from "@/lib/auth/options";
import { createStore } from "../actions";

export default async function CreateStorePage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <main className="min-h-0 w-full min-w-0">
      <div className="w-full min-w-0 bg-white px-4 py-6 md:px-8 md:py-8">
        <p className="mb-2 text-sm text-blueSteel">
          <Link
            href="/admin/stores"
            className="font-medium text-blue underline-offset-2 hover:underline"
          >
            ← К списку магазинов
          </Link>
        </p>
        <h1 className="text-2xl font-extrabold text-blueNavy">Добавить магазин</h1>
        <p className="mt-1 text-sm text-blueSteel">
          Slug подставляется из названия и должен оставаться уникальным.
        </p>

        <div className="mt-6 w-full min-w-0">
          <AdminStoreForm
            action={createStore}
            cancelHref="/admin/stores"
            submitLabel="Сохранить"
          />
        </div>
      </div>
    </main>
  );
}
