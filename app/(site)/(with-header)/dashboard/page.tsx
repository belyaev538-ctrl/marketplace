import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import {
  createMyStore,
  toggleProductActive,
  updateMyStore,
} from "./actions";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const userWithStore =
    userId != null
      ? await prisma.user.findUnique({
          where: { id: userId },
          include: {
            store: {
              include: {
                products: {
                  orderBy: { name: "asc" },
                  select: { id: true, name: true, active: true },
                },
              },
            },
          },
        })
      : null;

  const store = userWithStore?.store ?? null;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Кабинет магазина</h1>

      {!store ? (
        <section style={{ marginTop: "1.5rem" }}>
          <p>У вас ещё нет магазина.</p>
          <form action={createMyStore} style={{ marginTop: "1rem", maxWidth: "28rem" }}>
            <h2>Создать магазин</h2>
            <label style={{ display: "grid", gap: "0.25rem", marginTop: "0.75rem" }}>
              Название
              <input name="name" type="text" required />
            </label>
            <label style={{ display: "grid", gap: "0.25rem", marginTop: "0.75rem" }}>
              Slug (необязательно)
              <input name="slug" type="text" placeholder="авто из названия" />
            </label>
            <label style={{ display: "grid", gap: "0.25rem", marginTop: "0.75rem" }}>
              XML URL (необязательно)
              <input name="xmlUrl" type="text" placeholder="https://..." />
            </label>
            <label style={{ display: "grid", gap: "0.25rem", marginTop: "0.75rem" }}>
              Fallback URL (необязательно)
              <input name="fallbackUrl" type="text" placeholder="https://..." />
            </label>
            <button type="submit" style={{ marginTop: "1rem" }}>
              Создать магазин
            </button>
          </form>
        </section>
      ) : (
        <>
          <section style={{ marginTop: "1.5rem" }}>
            <h2>Данные магазина</h2>
            <dl style={{ marginTop: "0.5rem" }}>
              <dt>Название</dt>
              <dd>{store.name}</dd>
              <dt>Описание</dt>
              <dd>{store.shortDescription ?? "—"}</dd>
              <dt>Телефон</dt>
              <dd>{store.phone ?? "—"}</dd>
              <dt>Адрес</dt>
              <dd>{store.address ?? "—"}</dd>
              <dt>Сайт</dt>
              <dd>{store.website ?? "—"}</dd>
            </dl>
          </section>

          <section style={{ marginTop: "2rem" }}>
            <h2>Редактирование</h2>
            <form action={updateMyStore} style={{ maxWidth: "28rem", marginTop: "0.75rem" }}>
              <label style={{ display: "grid", gap: "0.25rem" }}>
                Название
                <input name="name" type="text" required defaultValue={store.name} />
              </label>
              <label style={{ display: "grid", gap: "0.25rem", marginTop: "0.75rem" }}>
                Описание
                <textarea
                  name="shortDescription"
                  rows={3}
                  defaultValue={store.shortDescription ?? ""}
                />
              </label>
              <label style={{ display: "grid", gap: "0.25rem", marginTop: "0.75rem" }}>
                Телефон
                <input name="phone" type="text" defaultValue={store.phone ?? ""} />
              </label>
              <label style={{ display: "grid", gap: "0.25rem", marginTop: "0.75rem" }}>
                Адрес
                <textarea name="address" rows={2} defaultValue={store.address ?? ""} />
              </label>
              <label style={{ display: "grid", gap: "0.25rem", marginTop: "0.75rem" }}>
                Сайт
                <input name="website" type="text" defaultValue={store.website ?? ""} />
              </label>
              <button type="submit" style={{ marginTop: "1rem" }}>
                Сохранить
              </button>
            </form>
          </section>

          <section style={{ marginTop: "2rem" }}>
            <h2>Товары</h2>
            {store.products.length === 0 ? (
              <p>Товаров пока нет.</p>
            ) : (
              <ul style={{ marginTop: "0.5rem", listStyle: "none", padding: 0 }}>
                {store.products.map((p) => (
                  <li
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span>
                      {p.name} — {p.active ? "active" : "inactive"}
                    </span>
                    <form action={toggleProductActive}>
                      <input type="hidden" name="productId" value={p.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={p.active ? "false" : "true"}
                      />
                      <button type="submit">
                        {p.active ? "Сделать inactive" : "Сделать active"}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
