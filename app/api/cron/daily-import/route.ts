import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  processImportQueue,
  SCHEDULED_IMPORT_JOB_PRIORITY,
} from "@/lib/process-import-queue";
import { ImportJobStatus } from "@prisma/client";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Каждый час (UTC): ставит в очередь автоимпорт для магазинов, у которых autoImportHourUtc совпадает с текущим часом UTC.
 * Раз в сутки на магазин — не чаще одного срабатывания в свой час.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const utcHour = new Date().getUTCHours();

  const stores = await prisma.store.findMany({
    where: {
      active: true,
      autoImport: true,
      autoImportHourUtc: utcHour,
      xmlUrl: { not: null },
    },
    select: { id: true, xmlUrl: true },
  });

  const eligible = stores.filter((s) => (s.xmlUrl ?? "").trim().length > 0);

  for (const s of eligible) {
    await prisma.importJob.create({
      data: {
        storeId: s.id,
        status: ImportJobStatus.pending,
        priority: SCHEDULED_IMPORT_JOB_PRIORITY,
      },
    });
  }

  await processImportQueue();

  return NextResponse.json({
    ok: true,
    enqueued: eligible.length,
    utcHour,
  });
}
