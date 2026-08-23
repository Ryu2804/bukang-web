/**
 * OSM via Nominatim — langsung terintegrasi.
 * Dipakai untuk: search autocomplete "Riau" → "Pekanbaru, Riau"
 *                reverse geocode lat/lng → alamat + heading + Kota,Provinsi
 *
 * Catatan usage policy Nominatim: 1 req/detik, butuh User-Agent & referer.
 * Frontend langsung ke nominatim.openstreetmap.org dengan fallback ke backend proxy
 * jika CORS / rate-limit. Backend proxy ada di /api/locations/search|reverse.
 */

import { normalizeHometown, searchLocations as searchStatic } from "../utils/location";
import type { LocationEntry } from "../data/locations";
import { apiUrl } from "./api";

export interface OSMLocation {
  city: string;
  province: string;
  label: string; // "Kota, Provinsi" — siap pakai untuk Asal Daerah
  displayName: string;
  lat: number;
  lon: number;
  osmId?: number;
  osmType?: string;
  importance?: number;
}

export interface OSMReverseResult {
  city: string;
  province: string;
  label: string; // "Kota, Provinsi"
  heading: string; // dekat dengan geocode.ts heading
  address: string; // display_name lengkap
  lat: number;
  lon: number;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

// --- helper: parse OSM address ke Kota,Provinsi (ID) ---
function parseAddressToCityProvince(address: Record<string, string>): { city: string; province: string } | null {
  // Indonesia: state = provinsi, city/town/county/village = kota/kabupaten
  const province =
    address.state ||
    address.state_district ||
    address.region ||
    "";
  const city =
    address.city ||
    address.town ||
    address.municipality ||
    address.county ||
    address.village ||
    address.hamlet ||
    address.suburb ||
    address.county ||
    "";

  if (province) {
    // kalau city kosong (mis. query "Riau" hanya state), fallback ke ibukota via normalize
    if (!city) {
      // gunakan normalizeHometown untuk dapat ibukota statis
      const fallbackLabel = normalizeHometown(province);
      // jika fallback menghasilkan "Pekanbaru, Riau", pecah lagi
      if (fallbackLabel.includes(",")) {
        const [c, prov] = fallbackLabel.split(",").map((s) => s.trim());
        return { city: c, province: prov };
      }
      return { city: province, province };
    }
    return { city, province };
  }
  // kalau tidak ada state tapi ada city saja (jarang), tetap pakai city sebagai province fallback
  if (city) return { city, province: city };
  return null;
}

function toLabel(city: string, province: string): string {
  if (!city || !province) return city || province;
  if (city.toLowerCase() === province.toLowerCase()) return `${city}, ${province}`;
  return `${city}, ${province}`;
}

// Map raw Nominatim json -> OSMLocation
function mapSearchResult(item: any): OSMLocation | null {
  const addr: Record<string, string> = item.address || {};
  // filter hanya Indonesia (country_code id)
  // Nominatim countrycodes=id sudah, tapi cek juga
  const parsed = parseAddressToCityProvince(addr);
  if (!parsed) return null;
  const { city, province } = parsed;
  // hasil label yang sudah extended tag
  // gunakan normalizeHometown supaya kalau province saja tetap jadi ibukota
  let label = toLabel(city, province);
  // normalisasi via existing logic (handle alias DKI Jakarta etc)
  const normalized = normalizeHometown(label);
  // jika normalized adalah label valid, pakai itu
  // jika tidak, tetap pakai label hasil OSM
  const finalLabel = normalized.includes(",") ? normalized : label;

  // final city/province dari finalLabel biar konsisten
  const parts = finalLabel.split(",").map((s) => s.trim());
  const finalCity = parts[0] || city;
  const finalProv = parts.slice(1).join(", ") || province;

  return {
    city: finalCity,
    province: finalProv,
    label: finalLabel,
    displayName: item.display_name as string,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    osmId: item.osm_id,
    osmType: item.osm_type,
    importance: item.importance,
  };
}

// --- cache sederhana di memory + debounce upstream ---
const searchCache = new Map<string, { ts: number; data: OSMLocation[] }>();
const REVERSE_CACHE = new Map<string, { ts: number; data: OSMReverseResult }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

function cacheGet<T>(map: Map<string, { ts: number; data: T }>, key: string): T | null {
  const e = map.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) {
    map.delete(key);
    return null;
  }
  return e.data;
}

// --- Backend proxy helpers (jika ada) ---
async function fetchViaBackendSearch(query: string, limit: number): Promise<OSMLocation[] | null> {
  try {
    const url = apiUrl(`/locations/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = await res.json();
    // backend format: { success, data: OSMLocation[] }
    const arr = body?.data ?? body;
    if (Array.isArray(arr)) return arr as OSMLocation[];
    return null;
  } catch {
    return null;
  }
}

async function fetchViaBackendReverse(lat: number, lon: number): Promise<OSMReverseResult | null> {
  try {
    const url = apiUrl(`/locations/reverse?lat=${lat}&lon=${lon}`);
    const res = await fetch(url);
    if (!res.ok) return null;
    const body = await res.json();
    const d = body?.data ?? body;
    if (d && d.label) return d as OSMReverseResult;
    return null;
  } catch {
    return null;
  }
}

// Public: search OSM (hybrid: backend proxy dulu, fallback ke Nominatim langsung)
// Jika semua gagal/rate-limit, fallback ke data statis (38 provinsi) supaya tetap terintegrasi offline.
export async function searchOSM(query: string, limit = 8): Promise<OSMLocation[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  const cacheKey = `${q.toLowerCase()}|${limit}`;
  const cached = cacheGet(searchCache, cacheKey);
  if (cached) return cached;

  // 1) coba backend proxy (lebih ramah rate-limit & User-Agent)
  const viaBackend = await fetchViaBackendSearch(q, limit);
  if (viaBackend && viaBackend.length > 0) {
    searchCache.set(cacheKey, { ts: Date.now(), data: viaBackend });
    return viaBackend;
  }

  // 2) fallback langsung ke Nominatim
  try {
    const url = `${NOMINATIM_BASE}/search?format=json&addressdetails=1&limit=${limit}&countrycodes=id&accept-language=id&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data = (await res.json()) as any[];
    const mapped = data.map(mapSearchResult).filter(Boolean) as OSMLocation[];
    // dedup by label
    const dedup = Array.from(new Map(mapped.map((m) => [m.label.toLowerCase(), m])).values());
    // sort by importance desc
    dedup.sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));
    const sliced = dedup.slice(0, limit);
    if (sliced.length > 0) {
      searchCache.set(cacheKey, { ts: Date.now(), data: sliced });
      return sliced;
    }
  } catch (err) {
    console.warn("[OSM] search Nominatim error, fallback static:", err);
  }

  // 3) fallback statis — tetap terintegrasi offline, contoh Riau → Pekanbaru, Riau
  const staticResults = searchStatic(q, limit);
  const mappedStatic: OSMLocation[] = staticResults.map((e: LocationEntry) => ({
    city: e.capital,
    province: e.province,
    label: e.label,
    displayName: `${e.label}, Indonesia`,
    lat: 0,
    lon: 0,
    importance: 0.5,
  }));
  searchCache.set(cacheKey, { ts: Date.now(), data: mappedStatic });
  return mappedStatic;
}

// Reverse geocode via OSM — dipakai untuk geotag foto & auto-isi Asal Daerah
export async function reverseOSM(lat: number, lon: number): Promise<OSMReverseResult | null> {
  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  const cached = cacheGet(REVERSE_CACHE, key);
  if (cached) return cached;

  // 1) backend proxy
  const viaBackend = await fetchViaBackendReverse(lat, lon);
  if (viaBackend) {
    REVERSE_CACHE.set(key, { ts: Date.now(), data: viaBackend });
    return viaBackend;
  }

  // 2) direct Nominatim
  try {
    const url = `${NOMINATIM_BASE}/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lon}&zoom=10&accept-language=id`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`reverse ${res.status}`);
    const data = await res.json();
    const addr: Record<string, string> = data.address || {};
    const heading = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state || "Lokasi";
    const displayName = data.display_name || heading;
    const parsed = parseAddressToCityProvince(addr);
    let label = displayName;
    if (parsed) {
      const rawLabel = toLabel(parsed.city, parsed.province);
      label = normalizeHometown(rawLabel);
    }
    // final split
    const parts = label.split(",").map((s: string) => s.trim());
    const result: OSMReverseResult = {
      city: parts[0] || parsed?.city || heading,
      province: parts.slice(1).join(", ") || parsed?.province || "",
      label,
      heading,
      address: displayName,
      lat,
      lon,
    };
    REVERSE_CACHE.set(key, { ts: Date.now(), data: result });
    return result;
  } catch (err) {
    console.warn("[OSM] reverse error:", err);
    return null;
  }
}

// Utility untuk cek apakah string sudah label valid via OSM/static
export function toExtendedTag(input: string): string {
  // coba normalize statis dulu, kalau sudah Kota,Provinsi langsung pakai
  const staticNorm = normalizeHometown(input);
  if (staticNorm.includes(",")) return staticNorm;
  // kalau input sudah mengandung koma, bersihkan
  if (input.includes(",")) return input.split(",").map((s: string) => s.trim()).join(", ");
  return staticNorm;
}
