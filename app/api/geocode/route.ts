import { NextRequest, NextResponse } from "next/server";

/**
 * Прокси к геокодеру Яндекса (из браузера часто бьёт CORS).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length > 200) {
    return NextResponse.json({ error: "bad_query" }, { status: 400 });
  }

  const key = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "no_api_key" }, { status: 500 });
  }

  const url = new URL("https://geocode-maps.yandex.ru/1.x/");
  url.searchParams.set("apikey", key);
  url.searchParams.set("geocode", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("results", "1");

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }

  const data = (await res.json()) as {
    response?: {
      GeoObjectCollection?: {
        featureMember?: { GeoObject?: { Point?: { pos?: string }; name?: string } }[];
      };
    };
  };

  const member = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
  const pos = member?.Point?.pos;
  if (typeof pos !== "string") {
    return NextResponse.json({ lat: null, lng: null, name: null });
  }

  const parts = pos.split(/\s+/).map(Number);
  const lng = parts[0];
  const lat = parts[1];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ lat: null, lng: null, name: null });
  }

  return NextResponse.json({
    lat,
    lng,
    name: typeof member?.name === "string" ? member.name : null,
  });
}
