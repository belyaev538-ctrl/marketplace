"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";

export async function setProductActive(
  productId: string,
  storeId: string,
  active: boolean,
): Promise<void> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/login");
  }

  const result = await prisma.product.updateMany({
    where: { id: productId, storeId },
    data: { active },
  });

  if (result.count === 0) {
    throw new Error("Товар не найден или не принадлежит магазину");
  }

  revalidatePath(`/admin/stores/${storeId}`);
  revalidatePath(`/admin/stores/${storeId}/products`);
  revalidatePath(`/admin/stores/${storeId}/settings`);
  revalidatePath("/admin/stores");
}
