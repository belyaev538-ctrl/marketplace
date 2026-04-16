"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";

function trimOrNull(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

export async function updateFooterSocial(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/login");
  }

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      footerTelegramUrl: trimOrNull(formData.get("footerTelegramUrl")),
      footerVkUrl: trimOrNull(formData.get("footerVkUrl")),
      footerWhatsappUrl: trimOrNull(formData.get("footerWhatsappUrl")),
      footerMaxUrl: trimOrNull(formData.get("footerMaxUrl")),
    },
    update: {
      footerTelegramUrl: trimOrNull(formData.get("footerTelegramUrl")),
      footerVkUrl: trimOrNull(formData.get("footerVkUrl")),
      footerWhatsappUrl: trimOrNull(formData.get("footerWhatsappUrl")),
      footerMaxUrl: trimOrNull(formData.get("footerMaxUrl")),
    },
  });

  revalidatePath("/", "layout");
  redirect("/admin/site-social");
}
