import { NextRequest, NextResponse } from "next/server";
import {
  getMapNearbyChildCategoriesData,
  getMapNearbyPanelData,
} from "@/lib/map-nearby-panel-data";
import { SEARCH_RADIUS_KM_OPTIONS } from "@/lib/search-radius-preference";

const RADIUS_LIST = SEARCH_RADIUS_KM_OPTIONS as readonly number[];

function parseCoord(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  const lat = parseCoord(req.nextUrl.searchParams.get("lat"));
  const lng = parseCoord(req.nextUrl.searchParams.get("lng"));
  const radiusRaw = req.nextUrl.searchParams.get("radiusKm");
  const parentCategorySlug = (req.nextUrl.searchParams.get("parentCategorySlug") ?? "").trim();
  const radiusKm = radiusRaw != null ? Number.parseInt(radiusRaw, 10) : NaN;

  if (lat == null || lng == null || !Number.isFinite(radiusKm) || !RADIUS_LIST.includes(radiusKm)) {
    return NextResponse.json({ error: "bad_params" }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "bad_coords" }, { status: 400 });
  }

  try {
    if (parentCategorySlug) {
      const categories = await getMapNearbyChildCategoriesData(lat, lng, radiusKm, parentCategorySlug);
      return NextResponse.json({ categories, storeBusinessTypeTiles: [] });
    }
    const data = await getMapNearbyPanelData(lat, lng, radiusKm);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
