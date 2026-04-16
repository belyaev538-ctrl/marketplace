import { NextRequest, NextResponse } from "next/server";

function isValidCoord(v: number, min: number, max: number): boolean {
  return Number.isFinite(v) && v >= min && v <= max;
}

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  if (!isValidCoord(lat, -90, 90) || !isValidCoord(lng, -180, 180)) {
    return NextResponse.json({ error: "bad_coords" }, { status: 400 });
  }

  const key = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "no_api_key" }, { status: 500 });
  }

  const url = new URL("https://geocode-maps.yandex.ru/1.x/");
  url.searchParams.set("apikey", key);
  url.searchParams.set("geocode", `${lng},${lat}`);
  url.searchParams.set("kind", "locality");
  url.searchParams.set("format", "json");
  url.searchParams.set("results", "1");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });

  const data = (await res.json()) as {
    response?: {
      GeoObjectCollection?: {
        featureMember?: { GeoObject?: { name?: string } }[];
      };
    };
  };
  const name = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.name;
  return NextResponse.json({ name: typeof name === "string" ? name : null });
}
