import { ImportJobStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import {
  MANUAL_IMPORT_JOB_PRIORITY,
  processImportQueue,
} from "@/lib/process-import-queue";

export async function POST(
  _request: Request,
  context: { params: { storeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const storeId = context.params.storeId;

    const job = await prisma.importJob.create({
      data: {
        storeId,
        status: ImportJobStatus.pending,
        priority: MANUAL_IMPORT_JOB_PRIORITY,
      },
    });

    await processImportQueue();

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
