"use server";

import {
  ImportJobStatus,
  Prisma,
  StoreFulfillmentMode,
  StoreType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import {
  MANUAL_IMPORT_JOB_PRIORITY,
  processImportQueue,
} from "@/lib/process-import-queue";
import { prisma } from "@/lib/prisma";
import { saveStoreLogoFromFile } from "@/lib/store-logo-file";
import { validateStoreRequiredFields } from "@/lib/store-form-validation";
import { parseStoreBusinessTypesFromForm } from "@/lib/store-business-type";
import { createUniqueStoreSlug } from "@/lib/store-slug";

function trimOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

function parseStoreType(raw: string | null): StoreType {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "cabinet") return StoreType.cabinet;
  if (v === "mixed") return StoreType.mixed;
  return StoreType.xml;
}

function parseFulfillmentModes(values: FormDataEntryValue[]): StoreFulfillmentMode[] {
  const out = new Set<StoreFulfillmentMode>();
  for (const raw of values) {
    const v = String(raw ?? "").trim().toLowerCase();
    if (v === "delivery") out.add(StoreFulfillmentMode.delivery);
    if (v === "pickup") out.add(StoreFulfillmentMode.pickup);
    if (v === "offline") out.add(StoreFulfillmentMode.offline);
  }
  if (out.size === 0) out.add(StoreFulfillmentMode.delivery);
  return Array.from(out);
}

/** Текст «Режим работы» в Json-поле (как JSON-строка); пусто → null. */
function workingHoursFromPlainText(
  raw: string,
): typeof Prisma.JsonNull | Prisma.InputJsonValue {
  const t = raw.trim();
  if (!t) return Prisma.JsonNull;
  return t;
}

function parseOptionalFloat(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Час 0–23 UTC для ежедневного автоимпорта. */
function parseAutoImportHourUtc(v: FormDataEntryValue | null): number {
  const n = Number.parseInt(String(v ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 0 || n > 23) {
    return 3;
  }
  return n;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/login");
  }
}

export async function createStore(formData: FormData) {
  await requireAdmin();

  if (validateStoreRequiredFields(formData).length > 0) {
    redirect("/admin/stores/create");
  }

  const name = String(formData.get("name") ?? "").trim();

  const desiredSlug = String(formData.get("slug") ?? "").trim();
  const slug = desiredSlug
    ? desiredSlug
    : await createUniqueStoreSlug(name);
  if (desiredSlug) {
    const taken = await prisma.store.findUnique({
      where: { slug: desiredSlug },
      select: { id: true },
    });
    if (taken) {
      redirect("/admin/stores/create");
    }
  }

  const active = formData.get("active") === "on";
  const showProducts = formData.get("showProducts") === "on";
  const autoImport = formData.get("autoImport") === "on";
  const autoImportHourUtc = parseAutoImportHourUtc(formData.get("autoImportHourUtc"));

  const shortDescription = trimOrNull(formData.get("shortDescription"));
  const fullDescription = trimOrNull(formData.get("fullDescription"));
  const workDescription = trimOrNull(formData.get("workDescription"));
  const businessTypes = parseStoreBusinessTypesFromForm(formData.getAll("businessTypes"));

  const created = await prisma.store.create({
    data: {
      name,
      slug,
      businessTypes,
      shortDescription,
      fullDescription,
      workDescription,
      xmlUrl: trimOrNull(formData.get("xmlUrl")),
      fallbackUrl: trimOrNull(formData.get("fallbackUrl")),
      website: trimOrNull(formData.get("website")),
      vkUrl: trimOrNull(formData.get("vkUrl")),
      telegramUrl: trimOrNull(formData.get("telegramUrl")),
      whatsappUrl: trimOrNull(formData.get("whatsappUrl")),
      otherMessengerUrl: trimOrNull(formData.get("otherMessengerUrl")),
      storeType: parseStoreType(String(formData.get("storeType") ?? "")),
      active,
      showProducts,
      fulfillmentModes: parseFulfillmentModes(formData.getAll("fulfillmentModes")),
      phone: trimOrNull(formData.get("phone")),
      address: trimOrNull(formData.get("address")),
      latitude: parseOptionalFloat(formData.get("latitude")),
      longitude: parseOptionalFloat(formData.get("longitude")),
      workingHours: workingHoursFromPlainText(
        String(formData.get("workingHours") ?? ""),
      ),
      autoImport,
      autoImportHourUtc,
    },
    select: { id: true, slug: true },
  });

  const logoFile = formData.get("logoFile");
  if (logoFile instanceof Blob && logoFile.size > 0) {
    const saved = await saveStoreLogoFromFile(created.id, logoFile);
    if (saved.ok) {
      await prisma.store.update({
        where: { id: created.id },
        data: { logo: saved.publicUrl },
      });
    }
  }

  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${created.id}/settings`);
  revalidatePath(`/stores/${created.slug}`);
  revalidatePath("/catalog");

  redirect(`/admin/stores/${encodeURIComponent(created.id)}/settings`);
}

export async function updateStore(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("storeId") ?? "").trim();
  if (!id) {
    redirect("/admin/stores");
  }

  const existing = await prisma.store.findUnique({
    where: { id },
    select: { id: true, slug: true, businessTypes: true },
  });
  if (!existing) {
    redirect("/admin/stores");
  }

  if (validateStoreRequiredFields(formData).length > 0) {
    redirect(`/admin/stores/${encodeURIComponent(id)}/settings`);
  }

  const name = String(formData.get("name") ?? "").trim();

  const desiredSlug = String(formData.get("slug") ?? "").trim();
  let slug: string;
  if (!desiredSlug) {
    slug = await createUniqueStoreSlug(name, { excludeStoreId: id });
  } else {
    const clash = await prisma.store.findFirst({
      where: { slug: desiredSlug, NOT: { id } },
      select: { id: true },
    });
    if (clash) {
      redirect(`/admin/stores/${encodeURIComponent(id)}/settings`);
    }
    slug = desiredSlug;
  }

  const active = formData.get("active") === "on";
  const showProducts = formData.get("showProducts") === "on";
  const autoImport = formData.get("autoImport") === "on";
  const autoImportHourUtc = parseAutoImportHourUtc(formData.get("autoImportHourUtc"));

  const shortDescription = trimOrNull(formData.get("shortDescription"));
  const fullDescription = trimOrNull(formData.get("fullDescription"));
  const workDescription = trimOrNull(formData.get("workDescription"));
  const businessTypes = parseStoreBusinessTypesFromForm(formData.getAll("businessTypes"));

  await prisma.store.update({
    where: { id },
    data: {
      name,
      slug,
      businessTypes,
      shortDescription,
      fullDescription,
      workDescription,
      xmlUrl: trimOrNull(formData.get("xmlUrl")),
      fallbackUrl: trimOrNull(formData.get("fallbackUrl")),
      website: trimOrNull(formData.get("website")),
      vkUrl: trimOrNull(formData.get("vkUrl")),
      telegramUrl: trimOrNull(formData.get("telegramUrl")),
      whatsappUrl: trimOrNull(formData.get("whatsappUrl")),
      otherMessengerUrl: trimOrNull(formData.get("otherMessengerUrl")),
      storeType: parseStoreType(String(formData.get("storeType") ?? "")),
      active,
      showProducts,
      fulfillmentModes: parseFulfillmentModes(formData.getAll("fulfillmentModes")),
      phone: trimOrNull(formData.get("phone")),
      address: trimOrNull(formData.get("address")),
      latitude: parseOptionalFloat(formData.get("latitude")),
      longitude: parseOptionalFloat(formData.get("longitude")),
      workingHours: workingHoursFromPlainText(
        String(formData.get("workingHours") ?? ""),
      ),
      autoImport,
      autoImportHourUtc,
    },
  });

  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${id}`);
  revalidatePath(`/admin/stores/${id}/settings`);
  revalidatePath(`/admin/stores/${id}/edit`);
  revalidatePath(`/admin/stores/${id}/products`);
  revalidatePath(`/admin/stores/${id}/categories`);
  revalidatePath(`/stores/${slug}`);
  revalidatePath("/catalog");
  redirect(`/admin/stores/${encodeURIComponent(id)}/settings?saved=1`);
}

export async function runManualImport(
  storeId: string,
): Promise<{ ok: true; jobId: string } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, error: "Нет доступа" };
  }

  const trimmed = storeId.trim();
  if (!trimmed) {
    return { ok: false, error: "Некорректный магазин" };
  }

  const store = await prisma.store.findUnique({
    where: { id: trimmed },
    select: { id: true, xmlUrl: true },
  });
  if (!store) {
    return { ok: false, error: "Магазин не найден" };
  }
  if (!store.xmlUrl?.trim()) {
    return { ok: false, error: "Не задан URL XML для выгрузки" };
  }

  try {
    const job = await prisma.importJob.create({
      data: {
        storeId: trimmed,
        status: ImportJobStatus.pending,
        priority: MANUAL_IMPORT_JOB_PRIORITY,
      },
    });
    await processImportQueue();
    const done = await prisma.importJob.findUnique({
      where: { id: job.id },
      select: { status: true, error: true },
    });
    revalidatePath("/admin/stores");
    if (done?.status === ImportJobStatus.failed) {
      return {
        ok: false,
        error: done.error?.trim() || "Импорт завершился с ошибкой",
      };
    }
    return { ok: true, jobId: job.id };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Вкл/выкл показ товаров в каталоге и в шапке (поле Store.showProducts — то же, что в настройках магазина). */
export async function setStoreShowProducts(
  storeId: string,
  showProducts: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, error: "Нет доступа" };
  }

  const trimmed = storeId.trim();
  if (!trimmed) {
    return { ok: false, error: "Некорректный магазин" };
  }

  try {
    const updated = await prisma.store.update({
      where: { id: trimmed },
      data: { showProducts },
      select: { id: true, slug: true },
    });

    revalidatePath("/admin/stores");
    revalidatePath(`/admin/stores/${updated.id}`);
    revalidatePath(`/admin/stores/${updated.id}/settings`);
    revalidatePath(`/admin/stores/${updated.id}/products`);
    revalidatePath(`/admin/stores/${updated.id}/categories`);
    revalidatePath("/catalog");
    revalidatePath(`/stores/${updated.slug}`);
    revalidatePath("/");

    return { ok: true };
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
    if (code === "P2025") {
      return { ok: false, error: "Магазин не найден" };
    }
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteStore(
  storeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, error: "Нет доступа" };
  }

  const trimmed = storeId.trim();
  if (!trimmed) {
    return { ok: false, error: "Некорректный магазин" };
  }

  const store = await prisma.store.findUnique({
    where: { id: trimmed },
    select: { id: true, name: true },
  });
  if (!store) {
    return { ok: false, error: "Магазин не найден" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { storeId: trimmed },
        data: { storeId: null },
      });
      await tx.product.deleteMany({ where: { storeId: trimmed } });
      await tx.store.delete({ where: { id: trimmed } });
    });
    revalidatePath("/admin/stores");
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
