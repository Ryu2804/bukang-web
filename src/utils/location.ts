import { INDONESIA_LOCATIONS, PROVINCE_ALIASES } from "../data/locations";
import type { LocationEntry } from "../data/locations";

const provinceMap = new Map<string, LocationEntry>();
const capitalMap = new Map<string, LocationEntry>();
const labelMap = new Map<string, LocationEntry>();

for (const e of INDONESIA_LOCATIONS) {
  provinceMap.set(e.province.toLowerCase(), e);
  capitalMap.set(e.capital.toLowerCase(), e);
  labelMap.set(e.label.toLowerCase(), e);
}

// alias map: alias lowercase -> official province lowercase
const aliasMap = new Map<string, string>();
for (const [alias, prov] of Object.entries(PROVINCE_ALIASES)) {
  aliasMap.set(alias.toLowerCase(), prov.toLowerCase());
}

export function normalizeHometown(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const lower = trimmed.toLowerCase();

  // Already in "Kota, Provinsi" format — normalize casing/spaces
  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const city = parts[0].toLowerCase();
      const provRaw = parts.slice(1).join(", ").toLowerCase();
      const provResolved = aliasMap.get(provRaw) ?? provRaw;
      // Exact label match
      const byLabel = labelMap.get(lower);
      if (byLabel) return byLabel.label;
      // Try to find by city + province combination
      const found = INDONESIA_LOCATIONS.find(
        (e) => e.capital.toLowerCase() === city && e.province.toLowerCase() === provResolved,
      );
      if (found) return found.label;
      // City alias? Jakarta case
      const provEntry = provinceMap.get(provResolved) ?? (aliasMap.has(provRaw) ? provinceMap.get(aliasMap.get(provRaw)!) : undefined);
      if (provEntry && provEntry.capital.toLowerCase() === city) return provEntry.label;
      // Otherwise return cleaned version with proper spacing
      return parts.join(", ");
    }
    return trimmed.replace(/\s*,\s*/g, ", ");
  }

  // Direct province match (incl. alias)
  const provKey = aliasMap.get(lower) ?? lower;
  if (provinceMap.has(provKey)) {
    return provinceMap.get(provKey)!.label;
  }
  // Alias direct to label (e.g. "jakarta" alias maps to DKI Jakarta province, but also capital map)
  if (aliasMap.has(lower)) {
    const prov = aliasMap.get(lower)!;
    const e = provinceMap.get(prov);
    if (e) return e.label;
  }
  // Capital city alone -> expand to "Kota, Provinsi"
  if (capitalMap.has(lower)) {
    return capitalMap.get(lower)!.label;
  }

  return trimmed;
}

export function searchLocations(query: string, limit = 8): LocationEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  // exact province alias expansion still should show that province first
  const aliasProv = aliasMap.get(q);
  if (aliasProv) {
    const e = provinceMap.get(aliasProv);
    if (e) return [e];
  }
  const results: LocationEntry[] = [];
  for (const e of INDONESIA_LOCATIONS) {
    const provLow = e.province.toLowerCase();
    const capLow = e.capital.toLowerCase();
    const labelLow = e.label.toLowerCase();
    const aliasMatch = Object.entries(PROVINCE_ALIASES).some(
      ([alias, prov]) => prov.toLowerCase() === provLow && alias.toLowerCase().includes(q),
    );
    if (provLow.includes(q) || capLow.includes(q) || labelLow.includes(q) || aliasMatch) {
      results.push(e);
    }
  }
  // Prioritize province prefix match, then capital
  results.sort((a, b) => {
    const aProv = a.province.toLowerCase().startsWith(q) ? 0 : a.capital.toLowerCase().startsWith(q) ? 1 : 2;
    const bProv = b.province.toLowerCase().startsWith(q) ? 0 : b.capital.toLowerCase().startsWith(q) ? 1 : 2;
    if (aProv !== bProv) return aProv - bProv;
    return a.province.localeCompare(b.province);
  });
  return results.slice(0, limit);
}

export function isLocationLabel(value: string): boolean {
  return labelMap.has(value.trim().toLowerCase());
}

export function parseHometown(value: string): { city: string; province: string; label: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Jika sudah mengandung koma, anggap sebagai Kota, Provinsi (generic OSM)
  if (trimmed.includes(",")) {
    const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const city = parts[0];
      const province = parts.slice(1).join(", ");
      const normalized = normalizeHometown(trimmed);
      const entry = labelMap.get(normalized.toLowerCase());
      if (entry) return { city: entry.capital, province: entry.province, label: entry.label };
      return { city, province, label: `${city}, ${province}` };
    }
  }
  const normalized = normalizeHometown(trimmed);
  if (normalized.includes(",")) {
    const parts = normalized.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const entry = labelMap.get(normalized.toLowerCase());
      if (entry) return { city: entry.capital, province: entry.province, label: entry.label };
      return { city: parts[0], province: parts.slice(1).join(", "), label: normalized };
    }
  }
  return null;
}

export type { LocationEntry };
