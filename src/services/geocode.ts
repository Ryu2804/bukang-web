export interface GeocodeResult {
  lat: number;
  lng: number;
  heading: string;
  address: string;
}

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
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`;
  const res = await fetch(url, {
    headers: { "User-Agent": "BukangApp/1.0" },
  });
  if (!res.ok) throw new Error("Gagal mengambil data alamat");
  const data = await res.json();
  const addr = data.address || {};
  const heading = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state_district || addr.state || "Lokasi";
  const address = data.display_name || "";
  return { lat, lng, heading, address };
}
