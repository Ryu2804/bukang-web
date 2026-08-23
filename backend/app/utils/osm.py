"""OSM Nominatim proxy — server-side untuk penuhi User-Agent policy & cache.

Dipakai frontend via /api/locations/search|reverse.
Fallback: frontend tetap bisa langsung ke Nominatim kalau backend proxy gagal.
"""
from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx

from app.utils.location import normalize_hometown, search_locations as static_search, LOCATIONS

NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
USER_AGENT = "Bukang/1.0"
OSM_EMAIL = "bukang@example.com"
# cache sederhana: key -> (ts, data)
_search_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_reverse_cache: dict[str, tuple[float, dict[str, Any]]] = {}
CACHE_TTL = 5 * 60  # 5 menit

_last_request_ts = 0.0
_LOCK = asyncio.Lock()


async def _throttle():
    global _last_request_ts
    async with _LOCK:
        now = time.monotonic()
        diff = now - _last_request_ts
        if diff < 1.1:
            await asyncio.sleep(1.1 - diff)
        _last_request_ts = time.monotonic()


def _parse_address_to_city_province(address: dict[str, str]) -> tuple[str, str] | None:
    province = address.get("state") or address.get("state_district") or address.get("region") or ""
    city = (
        address.get("city")
        or address.get("town")
        or address.get("municipality")
        or address.get("county")
        or address.get("village")
        or address.get("hamlet")
        or address.get("suburb")
        or ""
    )
    if province:
        if not city:
            fallback_label = normalize_hometown(province) or ""
            if "," in fallback_label:
                c, prov = [p.strip() for p in fallback_label.split(",", 1)]
                return c, prov
            return province, province
        return city, province
    if city:
        return city, city
    return None


def _to_label(city: str, province: str) -> str:
    if not city or not province:
        return city or province
    if city.lower() == province.lower():
        return f"{city}, {province}"
    return f"{city}, {province}"


def _map_search_item(item: dict[str, Any]) -> dict[str, Any] | None:
    addr: dict[str, str] = item.get("address") or {}
    parsed = _parse_address_to_city_province(addr)
    if not parsed:
        return None
    city, province = parsed
    raw_label = _to_label(city, province)
    normalized = normalize_hometown(raw_label) or raw_label
    final_label = normalized if "," in normalized else raw_label
    parts = [p.strip() for p in final_label.split(",", 1)] if "," in final_label else [city, province]
    final_city = parts[0] if len(parts) > 0 else city
    final_prov = parts[1] if len(parts) > 1 else province
    try:
        lat = float(item.get("lat", 0))
        lon = float(item.get("lon", 0))
    except Exception:
        lat, lon = 0.0, 0.0
    return {
        "city": final_city,
        "province": final_prov,
        "label": final_label,
        "displayName": item.get("display_name", ""),
        "lat": lat,
        "lon": lon,
        "osmId": item.get("osm_id"),
        "osmType": item.get("osm_type"),
        "importance": item.get("importance"),
    }


async def search_osm(query: str, limit: int = 8) -> list[dict[str, Any]]:
    q = query.strip()
    if not q or len(q) < 2:
        return []
    key = f"{q.lower()}|{limit}"
    now = time.time()
    if key in _search_cache:
        ts, data = _search_cache[key]
        if now - ts < CACHE_TTL:
            return data
        del _search_cache[key]

    await _throttle()
    url = f"{NOMINATIM_BASE}/search"
    params = {
        "format": "json",
        "addressdetails": "1",
        "limit": str(limit),
        "countrycodes": "id",
        "accept-language": "id",
        "q": q,
        "email": OSM_EMAIL,
    }
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        # Fallback ke data statis jika OSM gagal (403/429/offline)
        # static_search mengembalikan list[dict] dengan format mirip
        try:
            static = static_search(q, limit)
            # static_search mengembalikan list[dict] dari location.py — sudah label Kota,Provinsi
            fallback = [
                {
                    "city": s["capital"],
                    "province": s["province"],
                    "label": s["label"],
                    "displayName": s["label"] + ", Indonesia",
                    "lat": 0.0,
                    "lon": 0.0,
                    "osmId": None,
                    "osmType": None,
                    "importance": 0.5,
                }
                for s in static
            ]
            _search_cache[key] = (now, fallback)
            return fallback
        except Exception:
            _search_cache[key] = (now, [])
            return []

    mapped: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in data:
        m = _map_search_item(item)
        if not m:
            continue
        low = m["label"].lower()
        if low in seen:
            continue
        seen.add(low)
        mapped.append(m)
    # sort by importance desc
    mapped.sort(key=lambda x: x.get("importance") or 0, reverse=True)
    result = mapped[:limit]
    # Jika OSM tidak mengembalikan hasil tapi query adalah provinsi statis, pakai fallback
    if not result:
        try:
            static = static_search(q, limit)
            result = [
                {
                    "city": s["capital"],
                    "province": s["province"],
                    "label": s["label"],
                    "displayName": s["label"] + ", Indonesia",
                    "lat": 0.0,
                    "lon": 0.0,
                    "osmId": None,
                    "osmType": None,
                    "importance": 0.5,
                }
                for s in static
            ][:limit]
        except Exception:
            pass
    _search_cache[key] = (now, result)
    return result


async def reverse_osm(lat: float, lon: float) -> dict[str, Any] | None:
    key = f"{lat:.5f},{lon:.5f}"
    now = time.time()
    if key in _reverse_cache:
        ts, data = _reverse_cache[key]
        if now - ts < CACHE_TTL:
            return data
        del _reverse_cache[key]

    await _throttle()
    url = f"{NOMINATIM_BASE}/reverse"
    params = {
        "format": "json",
        "addressdetails": "1",
        "lat": str(lat),
        "lon": str(lon),
        "zoom": "10",
        "accept-language": "id",
        "email": OSM_EMAIL,
    }
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=8.0, headers=headers) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        # fallback: coba tebak dari koordinat? kembalikan minimal label kosong
        # atau coba static terdekat? untuk sekarang kembalikan None supaya frontend pakai heading default
        return None

    addr: dict[str, str] = data.get("address") or {}
    heading = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("municipality") or addr.get("county") or addr.get("state") or "Lokasi"
    display_name = data.get("display_name") or heading
    parsed = _parse_address_to_city_province(addr)
    if parsed:
        raw_label = _to_label(parsed[0], parsed[1])
        label = normalize_hometown(raw_label) or raw_label
    else:
        label = heading
    parts = [p.strip() for p in label.split(",", 1)] if "," in label else [label, ""]
    result = {
        "city": parts[0] if len(parts) > 0 else (parsed[0] if parsed else heading),
        "province": parts[1] if len(parts) > 1 and parts[1] else (parsed[1] if parsed else ""),
        "label": label,
        "heading": heading,
        "address": display_name,
        "lat": lat,
        "lon": lon,
    }
    _reverse_cache[key] = (now, result)
    return result
