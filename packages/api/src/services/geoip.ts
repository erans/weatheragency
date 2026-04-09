export interface GeoData {
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function extractGeo(request: Request): GeoData {
  const cf = (request as Request & { cf?: IncomingRequestCfProperties }).cf;
  if (!cf) {
    return {
      country: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
    };
  }
  return {
    country: (cf.country as string) ?? null,
    region: cf.region ?? null,
    city: cf.city ?? null,
    latitude: cf.latitude ? parseFloat(cf.latitude as string) : null,
    longitude: cf.longitude ? parseFloat(cf.longitude as string) : null,
  };
}

export async function hashIp(request: Request): Promise<string> {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for") ??
    "unknown";
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(ip)
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
