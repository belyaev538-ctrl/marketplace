import { unlink } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { saveStoreLogoFromFile } from "@/lib/store-logo-file";

export const runtime = "nodejs";

function uploadsStoresFilePath(logoPublicPath: string): string | null {
  if (!logoPublicPath.startsWith("/uploads/stores/")) return null;
  const rel = logoPublicPath.replace(/^\//, "");
  const abs = path.join(process.cwd(), "public", rel);
  const root = path.join(process.cwd(), "public", "uploads", "stores");
  if (!abs.startsWith(root)) return null;
  return abs;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Нет доступа" }, { status: 401 });
  }

  const formData = await request.formData();
  const storeIdRaw = String(formData.get("storeId") ?? "").trim();
  const file = formData.get("file");

  if (!storeIdRaw) {
    return Response.json({ error: "Укажите storeId" }, { status: 400 });
  }
  const store = await prisma.store.findUnique({
    where: { id: storeIdRaw },
    select: { id: true, slug: true, logo: true },
  });
  if (!store) {
    return Response.json({ error: "Магазин не найден" }, { status: 404 });
  }

  if (!(file instanceof Blob) || file.size === 0) {
    return Response.json({ error: "Файл не выбран" }, { status: 400 });
  }

  const saved = await saveStoreLogoFromFile(store.id, file);
  if (!saved.ok) {
    return Response.json({ error: saved.error }, { status: 400 });
  }
  const publicUrl = saved.publicUrl;

  const oldPath = store.logo ? uploadsStoresFilePath(store.logo.trim()) : null;
  if (oldPath) {
    try {
      await unlink(oldPath);
    } catch {
      /* ignore */
    }
  }

  await prisma.store.update({
    where: { id: store.id },
    data: { logo: publicUrl },
  });

  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${store.id}/settings`);
  revalidatePath(`/admin/stores/${store.id}/edit`);
  revalidatePath(`/stores/${store.slug}`);

  return Response.json({ ok: true as const, url: publicUrl });
}

/** Сбросить logo в БД; файл в /uploads/stores/ удаляется, если путь локальный. */
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "Нет доступа" }, { status: 401 });
  }

  const storeId = new URL(request.url).searchParams.get("storeId")?.trim();
  if (!storeId) {
    return Response.json({ error: "Укажите storeId" }, { status: 400 });
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, slug: true, logo: true },
  });
  if (!store) {
    return Response.json({ error: "Магазин не найден" }, { status: 404 });
  }

  const diskPath = store.logo ? uploadsStoresFilePath(store.logo.trim()) : null;
  if (diskPath) {
    try {
      await unlink(diskPath);
    } catch {
      /* ignore */
    }
  }

  await prisma.store.update({
    where: { id: store.id },
    data: { logo: null },
  });

  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${store.id}/settings`);
  revalidatePath(`/admin/stores/${store.id}/edit`);
  revalidatePath(`/stores/${store.slug}`);

  return Response.json({ ok: true as const });
}
