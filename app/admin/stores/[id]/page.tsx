import { redirect } from "next/navigation";

type Props = { params: { id: string } };

/** Единая карточка магазина: настройки по умолчанию (см. вкладки в layout). */
export default function AdminStoreIndexPage({ params }: Props) {
  const id = params.id?.trim();
  if (!id) {
    redirect("/admin/stores");
  }
  redirect(`/admin/stores/${encodeURIComponent(id)}/settings`);
}
