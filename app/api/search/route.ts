import { NextResponse } from "next/server";
import { searchProductsFullText } from "@/lib/product-search-fts";

const MIN_Q = 2;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const fulfillmentModes = searchParams.getAll("fulfillment");
  const minPriceRaw = searchParams.get("minPrice") ?? undefined;
  const maxPriceRaw = searchParams.get("maxPrice") ?? undefined;
  const sortRaw = searchParams.get("sort") ?? undefined;
  const businessTypesRaw = searchParams.getAll("businessTypes");
  const latRaw = searchParams.get("lat") ?? undefined;
  const lngRaw = searchParams.get("lng") ?? undefined;
  const radiusKmRaw = searchParams.get("radiusKm") ?? undefined;
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  );

  if (q.length < MIN_Q) {
    return NextResponse.json({
      items: [],
      hasMore: false,
      offset,
      limit,
    });
  }

  const { items, hasMore, total } = await searchProductsFullText(q, offset, limit, {
    fulfillmentModes,
    minPriceRaw,
    maxPriceRaw,
    sortRaw,
    businessTypesRaw,
    latRaw,
    lngRaw,
    radiusKmRaw,
  });

  const payload = items.map((p) => {
    const slug = p.slug.trim();
    return {
      id: p.id,
      slug: slug === "" ? null : slug,
      storeSlug: (p.storeSlug ?? "").trim() || null,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl,
      storeName: p.storeName,
      storeLogoUrl: p.storeLogo?.trim() || null,
      fulfillmentModes: p.fulfillmentModes,
    };
  });

  return NextResponse.json({
    items: payload,
    products: payload,
    hasMore,
    total,
    offset,
    limit,
  });
}
