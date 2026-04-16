"use server";

import { unlink } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/login");
  }
}

function trimOrNull(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

async function maybeDeleteUploadedFile(imageUrl: string) {
  if (!imageUrl.startsWith("/uploads/banners/")) return;
  const rel = imageUrl.replace(/^\//, "");
  const full = path.join(process.cwd(), "public", rel);
  try {
    await unlink(full);
  } catch {
    /* файл уже удалён или нет доступа */
  }
}

export async function createHomeBanner(formData: FormData) {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  if (!title || !imageUrl) {
    return { ok: false as const, error: "Укажите заголовок и загрузите изображение" };
  }

  const maxRow = await prisma.homeBanner.aggregate({
    _max: { sortOrder: true },
  });
  const sortOrder = (maxRow._max.sortOrder ?? -1) + 1;

  await prisma.homeBanner.create({
    data: {
      title,
      subtitle: trimOrNull(formData.get("subtitle")),
      imageUrl,
      linkUrl: trimOrNull(formData.get("linkUrl")),
      sortOrder,
      active: true,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/banners");
  return { ok: true as const };
}

export async function updateHomeBanner(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { ok: false as const, error: "Нет id" };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return { ok: false as const, error: "Заголовок обязателен" };
  }

  const sortRaw = String(formData.get("sortOrder") ?? "").trim();
  const sortOrder = sortRaw === "" ? 0 : Math.max(0, parseInt(sortRaw, 10) || 0);

  await prisma.homeBanner.update({
    where: { id },
    data: {
      title,
      subtitle: trimOrNull(formData.get("subtitle")),
      linkUrl: trimOrNull(formData.get("linkUrl")),
      sortOrder,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/banners");
  return { ok: true as const };
}

export async function toggleHomeBannerActive(id: string) {
  await requireAdmin();
  const trimmed = id.trim();
  if (!trimmed) return { ok: false as const, error: "Нет id" };

  const row = await prisma.homeBanner.findUnique({
    where: { id: trimmed },
    select: { active: true },
  });
  if (!row) return { ok: false as const, error: "Не найден" };

  await prisma.homeBanner.update({
    where: { id: trimmed },
    data: { active: !row.active },
  });

  revalidatePath("/");
  revalidatePath("/admin/banners");
  return { ok: true as const };
}

export async function deleteHomeBanner(id: string) {
  await requireAdmin();
  const trimmed = id.trim();
  if (!trimmed) return { ok: false as const, error: "Нет id" };

  const row = await prisma.homeBanner.findUnique({
    where: { id: trimmed },
    select: { imageUrl: true },
  });
  if (!row) return { ok: false as const, error: "Не найден" };

  await prisma.homeBanner.delete({ where: { id: trimmed } });
  await maybeDeleteUploadedFile(row.imageUrl);

  revalidatePath("/");
  revalidatePath("/admin/banners");
  return { ok: true as const };
}
