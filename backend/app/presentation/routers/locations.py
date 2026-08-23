from fastapi import APIRouter, Query
from app.presentation.schemas.response import success
from app.utils.osm import search_osm, reverse_osm

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get(
    "/search",
    summary="Search lokasi via OSM Nominatim (Kota, Provinsi)",
    responses={200: {"description": "List lokasi OSM"}},
)
async def search_locations(
    q: str = Query(..., min_length=2, description="Query lokasi, cth: Riau, Pekanbaru, Surabaya"),
    limit: int = Query(8, ge=1, le=20),
):
    data = await search_osm(q, limit)
    return success(data)


@router.get(
    "/reverse",
    summary="Reverse geocode lat/lon via OSM → label Kota,Provinsi",
    responses={200: {"description": "Alamat dari koordinat"}},
)
async def reverse_location(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
):
    data = await reverse_osm(lat, lon)
    return success(data)
