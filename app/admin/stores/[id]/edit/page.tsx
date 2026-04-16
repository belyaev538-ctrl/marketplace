import { redirect } from "next/navigation";

type Props = { params: { id: string } };

/** Старый URL редактирования — редирект на вкладку «Настройки». */
export default function AdminStoreEditRedirectPage({ params }: Props) {
  const id = params.id?.trim();
  if (!id) {
    redirect("/admin/stores");
  }
  redirect(`/admin/stores/${encodeURIComponent(id)}/settings`);
}
