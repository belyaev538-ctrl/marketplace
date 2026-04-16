import { prisma } from "@/lib/prisma";
import { importStoreProducts } from "@/lib/import-store-products";
import { ImportJobStatus } from "@prisma/client";

const MAX_CONCURRENT = 2;
const IMPORT_TIMEOUT_MS = 5 * 60 * 1000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timeoutId)
  ) as Promise<T>;
}

async function claimNextPendingJob(): Promise<{
  id: string;
  storeId: string;
} | null> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const next = await prisma.importJob.findFirst({
      where: { status: ImportJobStatus.pending },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      select: { id: true, storeId: true },
    });
    if (!next) return null;

    const res = await prisma.importJob.updateMany({
      where: { id: next.id, status: ImportJobStatus.pending },
      data: {
        status: ImportJobStatus.processing,
        startedAt: new Date(),
      },
    });
    if (res.count === 1) return next;
  }
  return null;
}

async function executeImportJob(job: { id: string; storeId: string }) {
  const errorText = (e: unknown) =>
    e instanceof Error && e.message === "timeout" ? "timeout" : String(e);

  const store = await prisma.store.findUnique({
    where: { id: job.storeId },
    select: { xmlUrl: true, autoImport: true },
  });

  const skipReason =
    store == null
      ? "Магазин не найден"
      : !store.autoImport
        ? "autoImport выключен"
        : !store.xmlUrl?.trim()
          ? "Нет URL XML"
          : null;

  if (skipReason) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.success,
        finishedAt: new Date(),
        error: null,
      },
    });
    await prisma.importLog.create({
      data: {
        storeId: job.storeId,
        status: "success",
        message: `Import job ${job.id} пропущен: ${skipReason}`,
      },
    });
    return;
  }

  try {
    await withTimeout(
      importStoreProducts(job.storeId, { skipImportLog: true }),
      IMPORT_TIMEOUT_MS
    );

    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.success,
        finishedAt: new Date(),
        error: null,
      },
    });

    await prisma.importLog.create({
      data: {
        storeId: job.storeId,
        status: "success",
        message: `Import job ${job.id} completed`,
      },
    });
  } catch (e) {
    const err = errorText(e);
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.failed,
        finishedAt: new Date(),
        error: err,
      },
    });

    await prisma.importLog.create({
      data: {
        storeId: job.storeId,
        status: "failed",
        message: `Import job ${job.id}: ${err}`,
      },
    });
  }
}

/**
 * Обрабатывает очередь: не больше двух job в статусе processing одновременно.
 * Рекурсивно дочищает pending, пока очередь не пуста или слоты заняты.
 */
export async function processImportQueue(): Promise<void> {
  const processing = await prisma.importJob.count({
    where: { status: ImportJobStatus.processing },
  });
  let slots = Math.max(0, MAX_CONCURRENT - processing);

  const claimed: { id: string; storeId: string }[] = [];
  while (slots > 0) {
    const job = await claimNextPendingJob();
    if (!job) break;
    claimed.push(job);
    slots--;
  }

  if (claimed.length === 0) return;

  await Promise.all(claimed.map((j) => executeImportJob(j)));
  await processImportQueue();
}

/** Ручной запуск: job в начале очереди (повышенный priority). */
export const MANUAL_IMPORT_JOB_PRIORITY = 100;

/** Плановый cron: обычный приоритет. */
export const SCHEDULED_IMPORT_JOB_PRIORITY = 0;
