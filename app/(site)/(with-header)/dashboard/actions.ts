"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";

async function requireShopOwner() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "SHOP_OWNER") {
    redirect("/login");
  }
  return session.user.id;
}

async function getOwnerStoreId(userId: string) {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { storeId: true },
  });
  return row?.storeId ?? null;
}

function slugCandidate(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base : `store-${Date.now()}`;
}

export async function createMyStore(formData: FormData) {
  const userId = await requireShopOwner();

  const existingStoreId = await getOwnerStoreId(userId);
  if (existingStoreId) {
    redirect("/dashboard");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect("/dashboard");
  }

  let slug = String(formData.get("slug") ?? "").trim() || slugCandidate(name);
  const xmlUrl =
    String(formData.get("xmlUrl") ?? "").trim() || "https://example.com/feed.xml";
  const fallbackUrl =
    String(formData.get("fallbackUrl") ?? "").trim() || "https://example.com";

  let n = 0;
  while (await prisma.store.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugCandidate(name)}-${n}`;
  }

  const created = await prisma.store.create({
    data: {
      name,
      slug,
      xmlUrl,
      fallbackUrl,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { storeId: created.id },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateMyStore(formData: FormData) {
  const userId = await requireShopOwner();
  const storeId = await getOwnerStoreId(userId);
  if (!storeId) {
    redirect("/dashboard");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    redirect("/dashboard");
  }

  const shortDescription = String(formData.get("shortDescription") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const websiteRaw = String(formData.get("website") ?? "").trim();
  const website = websiteRaw.length > 0 ? websiteRaw : null;

  await prisma.store.update({
    where: { id: storeId },
    data: {
      name,
      shortDescription,
      phone,
      address,
      website,
    },
  });

  revalidatePath("/dashboard");
}

export async function toggleProductActive(formData: FormData) {
  const userId = await requireShopOwner();
  const storeId = await getOwnerStoreId(userId);
  if (!storeId) {
    redirect("/dashboard");
  }

  const productId = String(formData.get("productId") ?? "").trim();
  const active = formData.get("active") === "true";

  if (!productId) {
    redirect("/dashboard");
  }

  await prisma.product.updateMany({
    where: { id: productId, storeId },
    data: { active },
  });

  revalidatePath("/dashboard");
}
