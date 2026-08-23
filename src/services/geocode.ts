export interface GeocodeResult {
  lat: number;
  lng: number;
  heading: string;
  address: string;
}

import { apiUrl } from "./api";

export function getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation tidak didukung browser ini"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        const messages: Record<number, string> = {
          [err.PERMISSION_DENIED]: "Ijin lokasi ditolak. Aktifkan lokasi di pengaturan browser.",
          [err.POSITION_UNAVAILABLE]: "Lokasi tidak tersedia. Coba di area terbuka.",
          [err.TIMEOUT]: "Waktu permintaan lokasi habis. Coba lagi.",
        };
        reject(new Error(messages[err.code] || "Gagal mendapatkan lokasi"));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000, ...options }
    );
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  // Coba backend proxy dulu (lebih taat policy Nominatim & ada cache), fallback ke direct
  try {
    const proxyRes = await fetch(apiUrl(`/locations/reverse?lat=${lat}&lon=${lng}`));
    if (proxyRes.ok) {
      const body = await proxyRes.json();
      const data = body.data ?? body;
      if (data && data.address) {
        return { lat, lng, heading: data.heading || data.city || "Lokasi", address: data.address };
      }
      if (data && data.label) {
        // backend mengembalikan label Kota, Provinsi — pakai sebagai heading juga
        return { lat, lng, heading: data.city || data.heading || "Lokasi", address: data.address || data.label };
      }
    }
  } catch {
    // ignore, fallback ke direct
  }
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Gagal mengambil data alamat");
  const data = await res.json();
  const addr = data.address || {};
  const heading = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state_district || addr.state || "Lokasi";
  const address = data.display_name || "";
  return { lat, lng, heading, address };
}
