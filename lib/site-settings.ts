import { prisma } from "@/lib/prisma";

export type FooterSocialLinks = {
  telegram: string | null;
  vk: string | null;
  whatsapp: string | null;
  max: string | null;
};

const empty: FooterSocialLinks = {
  telegram: null,
  vk: null,
  whatsapp: null,
  max: null,
};

/** Ссылки «Мы в соцсетях» для футера. */
export async function getFooterSocialLinks(): Promise<FooterSocialLinks> {
  try {
    const row = await prisma.siteSettings.findUnique({
      where: { id: "default" },
      select: {
        footerTelegramUrl: true,
        footerVkUrl: true,
        footerWhatsappUrl: true,
        footerMaxUrl: true,
      },
    });
    if (!row) return empty;
    const t = (v: string | null) => (v?.trim() ? v.trim() : null);
    return {
      telegram: t(row.footerTelegramUrl),
      vk: t(row.footerVkUrl),
      whatsapp: t(row.footerWhatsappUrl),
      max: t(row.footerMaxUrl),
    };
  } catch {
    return empty;
  }
}
