"""Indonesia province -> capital normalization.

Contoh: input "Riau" -> "Pekanbaru, Riau"
        input "Pekanbaru" -> "Pekanbaru, Riau"
        input "Pekanbaru, Riau" -> tetap "Pekanbaru, Riau"
"""

from __future__ import annotations

LOCATIONS: list[dict[str, str]] = [
    {"province": "Aceh", "capital": "Banda Aceh", "label": "Banda Aceh, Aceh"},
    {"province": "Sumatera Utara", "capital": "Medan", "label": "Medan, Sumatera Utara"},
    {"province": "Sumatera Barat", "capital": "Padang", "label": "Padang, Sumatera Barat"},
    {"province": "Riau", "capital": "Pekanbaru", "label": "Pekanbaru, Riau"},
    {"province": "Jambi", "capital": "Jambi", "label": "Jambi, Jambi"},
    {"province": "Sumatera Selatan", "capital": "Palembang", "label": "Palembang, Sumatera Selatan"},
    {"province": "Bengkulu", "capital": "Bengkulu", "label": "Bengkulu, Bengkulu"},
    {"province": "Lampung", "capital": "Bandar Lampung", "label": "Bandar Lampung, Lampung"},
    {"province": "Kepulauan Bangka Belitung", "capital": "Pangkal Pinang", "label": "Pangkal Pinang, Kepulauan Bangka Belitung"},
    {"province": "Kepulauan Riau", "capital": "Tanjung Pinang", "label": "Tanjung Pinang, Kepulauan Riau"},
    {"province": "DKI Jakarta", "capital": "Jakarta", "label": "Jakarta, DKI Jakarta"},
    {"province": "Jawa Barat", "capital": "Bandung", "label": "Bandung, Jawa Barat"},
    {"province": "Jawa Tengah", "capital": "Semarang", "label": "Semarang, Jawa Tengah"},
    {"province": "DI Yogyakarta", "capital": "Yogyakarta", "label": "Yogyakarta, DI Yogyakarta"},
    {"province": "Jawa Timur", "capital": "Surabaya", "label": "Surabaya, Jawa Timur"},
    {"province": "Banten", "capital": "Serang", "label": "Serang, Banten"},
    {"province": "Bali", "capital": "Denpasar", "label": "Denpasar, Bali"},
    {"province": "Nusa Tenggara Barat", "capital": "Mataram", "label": "Mataram, Nusa Tenggara Barat"},
    {"province": "Nusa Tenggara Timur", "capital": "Kupang", "label": "Kupang, Nusa Tenggara Timur"},
    {"province": "Kalimantan Barat", "capital": "Pontianak", "label": "Pontianak, Kalimantan Barat"},
    {"province": "Kalimantan Tengah", "capital": "Palangka Raya", "label": "Palangka Raya, Kalimantan Tengah"},
    {"province": "Kalimantan Selatan", "capital": "Banjarmasin", "label": "Banjarmasin, Kalimantan Selatan"},
    {"province": "Kalimantan Timur", "capital": "Samarinda", "label": "Samarinda, Kalimantan Timur"},
    {"province": "Kalimantan Utara", "capital": "Tanjung Selor", "label": "Tanjung Selor, Kalimantan Utara"},
    {"province": "Sulawesi Utara", "capital": "Manado", "label": "Manado, Sulawesi Utara"},
    {"province": "Gorontalo", "capital": "Gorontalo", "label": "Gorontalo, Gorontalo"},
    {"province": "Sulawesi Tengah", "capital": "Palu", "label": "Palu, Sulawesi Tengah"},
    {"province": "Sulawesi Barat", "capital": "Mamuju", "label": "Mamuju, Sulawesi Barat"},
    {"province": "Sulawesi Selatan", "capital": "Makassar", "label": "Makassar, Sulawesi Selatan"},
    {"province": "Sulawesi Tenggara", "capital": "Kendari", "label": "Kendari, Sulawesi Tenggara"},
    {"province": "Maluku", "capital": "Ambon", "label": "Ambon, Maluku"},
    {"province": "Maluku Utara", "capital": "Sofifi", "label": "Sofifi, Maluku Utara"},
    {"province": "Papua", "capital": "Jayapura", "label": "Jayapura, Papua"},
    {"province": "Papua Barat", "capital": "Manokwari", "label": "Manokwari, Papua Barat"},
    {"province": "Papua Barat Daya", "capital": "Sorong", "label": "Sorong, Papua Barat Daya"},
    {"province": "Papua Pegunungan", "capital": "Wamena", "label": "Wamena, Papua Pegunungan"},
    {"province": "Papua Tengah", "capital": "Nabire", "label": "Nabire, Papua Tengah"},
    {"province": "Papua Selatan", "capital": "Merauke", "label": "Merauke, Papua Selatan"},
]

ALIASES: dict[str, str] = {
    "jakarta": "DKI Jakarta",
    "dki jakarta": "DKI Jakarta",
    "yogyakarta": "DI Yogyakarta",
    "jogja": "DI Yogyakarta",
    "jogjakarta": "DI Yogyakarta",
    "di yogyakarta": "DI Yogyakarta",
    "diy": "DI Yogyakarta",
    "bangka belitung": "Kepulauan Bangka Belitung",
    "bangka": "Kepulauan Bangka Belitung",
    "kep bangka belitung": "Kepulauan Bangka Belitung",
    "kep. bangka belitung": "Kepulauan Bangka Belitung",
    "kep riau": "Kepulauan Riau",
    "kep. riau": "Kepulauan Riau",
    "ntb": "Nusa Tenggara Barat",
    "ntt": "Nusa Tenggara Timur",
    "kalteng": "Kalimantan Tengah",
    "kaltim": "Kalimantan Timur",
    "kalsel": "Kalimantan Selatan",
    "kalbar": "Kalimantan Barat",
    "kaltara": "Kalimantan Utara",
    "sulteng": "Sulawesi Tengah",
    "sultenggara": "Sulawesi Tenggara",
    "sultra": "Sulawesi Tenggara",
    "sulut": "Sulawesi Utara",
    "sulsel": "Sulawesi Selatan",
    "sulbar": "Sulawesi Barat",
    "malut": "Maluku Utara",
}

_province_map = {e["province"].lower(): e for e in LOCATIONS}
_capital_map = {e["capital"].lower(): e for e in LOCATIONS}
_label_map = {e["label"].lower(): e for e in LOCATIONS}
_alias_map = {k.lower(): v.lower() for k, v in ALIASES.items()}


def normalize_hometown(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return trimmed
    lower = trimmed.lower()

    # Already "Kota, Provinsi" format
    if "," in trimmed:
        parts = [p.strip() for p in trimmed.split(",") if p.strip()]
        if len(parts) >= 2:
            city = parts[0].lower()
            prov_raw = ", ".join(parts[1:]).lower()
            prov_resolved = _alias_map.get(prov_raw, prov_raw)
            # exact label
            if lower in _label_map:
                return _label_map[lower]["label"]
            for e in LOCATIONS:
                if e["capital"].lower() == city and e["province"].lower() == prov_resolved:
                    return e["label"]
            # try province alias resolution
            prov_entry = _province_map.get(prov_resolved)
            if prov_entry and prov_entry["capital"].lower() == city:
                return prov_entry["label"]
            return ", ".join(parts)
        return trimmed.replace(" ", "").replace(",", ", ")  # fallback

    prov_key = _alias_map.get(lower, lower)
    if prov_key in _province_map:
        return _province_map[prov_key]["label"]
    if lower in _alias_map:
        prov = _alias_map[lower]
        e = _province_map.get(prov)
        if e:
            return e["label"]
    if lower in _capital_map:
        return _capital_map[lower]["label"]
    return trimmed


def search_locations(query: str, limit: int = 8) -> list[dict[str, str]]:
    q = query.strip().lower()
    if not q:
        return []
    alias_prov = _alias_map.get(q)
    if alias_prov:
        e = _province_map.get(alias_prov)
        if e:
            return [e]
    results: list[dict[str, str]] = []
    for e in LOCATIONS:
        prov_low = e["province"].lower()
        cap_low = e["capital"].lower()
        label_low = e["label"].lower()
        alias_match = any(alias.lower() in q or q in alias.lower() for alias, prov in ALIASES.items() if prov.lower() == prov_low)
        if q in prov_low or q in cap_low or q in label_low or alias_match:
            results.append(e)
    # prioritize province prefix
    def sort_key(entry: dict[str, str]) -> tuple[int, str]:
        prov = entry["province"].lower()
        cap = entry["capital"].lower()
        if prov.startswith(q):
            return (0, entry["province"])
        if cap.startswith(q):
            return (1, entry["province"])
        return (2, entry["province"])

    results.sort(key=sort_key)
    return results[:limit]
