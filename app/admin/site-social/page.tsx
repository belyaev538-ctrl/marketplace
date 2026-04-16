import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { updateFooterSocial } from "./actions";

const fieldClass =
  "w-full rounded-md border border-blueExtraLight bg-blueUltraLight py-[11px] ps-[9px] pe-3 text-[13px] font-medium text-blueNavy outline-none placeholder:text-blueSteel focus:border-blueLight";

export default async function AdminSiteSocialPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/login");
  }

  const row = await prisma.siteSettings.findUnique({ where: { id: "default" } });

  return (
    <main className="min-h-0">
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-8">
        <p className="mb-2 text-sm text-blueSteel">
          <Link
            href="/admin/stores"
            className="font-medium text-blue underline-offset-2 hover:underline"
          >
            ← Админка
          </Link>
        </p>
        <h1 className="text-2xl font-extrabold text-blueNavy">Соцсети в футере</h1>
        <p className="mt-1 text-sm text-blueSteel">
          Укажите полные ссылки (https://…). Пустое поле — иконка или подпись в подвале не показываются.
          Telegram и ВК отображаются с прежними значками; WhatsApp и MAX — текстовыми ссылками рядом.
        </p>

        <form action={updateFooterSocial} className="mt-8 flex flex-col gap-[22px]">
          <div className="flex flex-col gap-2">
            <label htmlFor="footerTelegramUrl" className="text-[13px] font-bold text-blueNavy">
              Telegram
            </label>
            <input
              id="footerTelegramUrl"
              name="footerTelegramUrl"
              type="url"
              defaultValue={row?.footerTelegramUrl ?? ""}
              placeholder="https://t.me/…"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="footerVkUrl" className="text-[13px] font-bold text-blueNavy">
              ВКонтакте
            </label>
            <input
              id="footerVkUrl"
              name="footerVkUrl"
              type="url"
              defaultValue={row?.footerVkUrl ?? ""}
              placeholder="https://vk.com/…"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="footerWhatsappUrl" className="text-[13px] font-bold text-blueNavy">
              WhatsApp
            </label>
            <input
              id="footerWhatsappUrl"
              name="footerWhatsappUrl"
              type="url"
              defaultValue={row?.footerWhatsappUrl ?? ""}
              placeholder="https://wa.me/…"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="footerMaxUrl" className="text-[13px] font-bold text-blueNavy">
              MAX (или другая ссылка)
            </label>
            <input
              id="footerMaxUrl"
              name="footerMaxUrl"
              type="url"
              defaultValue={row?.footerMaxUrl ?? ""}
              placeholder="https://…"
              className={fieldClass}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-blue py-[11px] text-[13px] font-bold text-white transition-opacity hover:opacity-95 sm:w-auto sm:min-w-[200px]"
          >
            Сохранить
          </button>
        </form>
      </div>
    </main>
  );
}
