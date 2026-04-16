import { Prisma } from "@prisma/client";

/** Режимы, которые пользователь может выбрать в витринном фильтре (без legacy `both`). */
export type PublicFulfillmentFilterMode = "delivery" | "pickup" | "offline";

export function parsePublicFulfillmentFilters(
  raw: string[],
): PublicFulfillmentFilterMode[] {
  return Array.from(
    new Set(
      raw.filter((v): v is PublicFulfillmentFilterMode =>
        v === "delivery" || v === "pickup" || v === "offline",
      ),
    ),
  );
}

/**
 * Магазин проходит фильтр по режиму, если в `fulfillmentModes` есть сам режим
 * или legacy-значение `both` (доставка + самовывоз). Для `offline` только явный offline.
 */
export function storeWhereMatchesFulfillmentFilters(
  selected: PublicFulfillmentFilterMode[],
): Prisma.StoreWhereInput {
  return {
    AND: selected.map((mode) => {
      if (mode === "offline") {
        return { fulfillmentModes: { has: "offline" } };
      }
      return {
        OR: [
          { fulfillmentModes: { has: mode } },
          { fulfillmentModes: { has: "both" } },
        ],
      };
    }),
  };
}

function fulfillmentEnumArraySql(mode: PublicFulfillmentFilterMode): Prisma.Sql {
  switch (mode) {
    case "delivery":
      return Prisma.sql`ARRAY['delivery']::"StoreFulfillmentMode"[]`;
    case "pickup":
      return Prisma.sql`ARRAY['pickup']::"StoreFulfillmentMode"[]`;
    case "offline":
      return Prisma.sql`ARRAY['offline']::"StoreFulfillmentMode"[]`;
  }
}

/** Условие для raw SQL: алиас таблицы магазина + выбранные режимы (AND). */
export function sqlStoreFulfillmentAndClause(
  tableAlias: string,
  selected: PublicFulfillmentFilterMode[],
): Prisma.Sql {
  const col = Prisma.raw(`"${tableAlias}"."fulfillmentModes"`);
  const parts = selected.map((mode) => {
    if (mode === "offline") {
      return Prisma.sql`${col} @> ${fulfillmentEnumArraySql("offline")}`;
    }
    return Prisma.sql`(${col} @> ${fulfillmentEnumArraySql(
      mode,
    )} OR ${col} @> ARRAY['both']::"StoreFulfillmentMode"[])`;
  });
  return Prisma.sql`(${Prisma.join(parts, " AND ")})`;
}

/** Для витрины: legacy `both` показываем как delivery + pickup (без значения `both` в JSON). */
export function fulfillmentModesForPublicListing(
  modes: readonly ("delivery" | "pickup" | "both" | "offline")[],
): string[] {
  const out = new Set<string>();
  for (const m of modes) {
    if (m === "both") {
      out.add("delivery");
      out.add("pickup");
    } else {
      out.add(m);
    }
  }
  return Array.from(out);
}
