import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "Falta la dirección" }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${q}, Argentina`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "RutasHimetal/1.0 contacto@himetal.com.ar",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8"
      },
      next: { revalidate: 60 * 60 * 24 }
    });

    if (!res.ok) {
      return NextResponse.json({ error: "No se pudo consultar el mapa" }, { status: 502 });
    }

    const data = await res.json();
    const first = data?.[0];

    if (!first) {
      return NextResponse.json({ error: "No encontré coordenadas para esa dirección" }, { status: 404 });
    }

    return NextResponse.json({
      lat: Number(first.lat),
      lng: Number(first.lon),
      displayName: first.display_name
    });
  } catch (error) {
    return NextResponse.json({ error: "Error buscando coordenadas" }, { status: 500 });
  }
}
