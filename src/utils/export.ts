import * as XLSX from "xlsx";
import JSZip from "jszip";
import { apiUrl, authFetch } from "../services/api";

interface ExportRow {
  nrp: string;
  name: string;
  major: string;
  status: string;
  asal_daerah: string;
  hobi: string;
  first_impression: string;
  captured_at: string;
  latitude: string;
  longitude: string;
  photo_url: string;
  photo_link: string;
}

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "")
    .replace(/_+/g, "_")
    .slice(0, 50) || "Unknown";
}

export async function fetchAllEntries(
  search: string,
  major: string,
  status: string,
): Promise<ExportRow[]> {
  const params = new URLSearchParams({ search, major, status, all: "true" });
  const res = await authFetch(apiUrl(`/students/roster?${params}`));
  if (!res.ok && res.status !== 401) throw new Error("Gagal mengambil data");
  const body = await res.json();
  if (!body.success) throw new Error("Gagal mengambil data");

  return body.data.entries.map((e: any) => ({
    nrp: e.nrp,
    name: e.name,
    major: e.major,
    status: e.submitted ? "Terkumpul" : "Belum",
    asal_daerah: e.hometown ?? "",
    hobi: e.hobbies ?? "",
    first_impression: e.first_impression ?? "",
    captured_at: e.captured_at ?? "",
    latitude: e.latitude != null ? String(e.latitude) : "",
    longitude: e.longitude != null ? String(e.longitude) : "",
    photo_url: e.photo_url ?? "",
    photo_link: e.photo_url ?? "",
  }));
}

export function downloadCSV(rows: ExportRow[], filename: string) {
  const headers = [
    "NRP", "Nama", "Prodi", "Status",
    "Asal Daerah", "Hobi", "First Impression",
    "Captured At", "Latitude", "Longitude",
    "Link Foto",
  ];
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.nrp, r.name, r.major, r.status,
        r.asal_daerah, r.hobi, r.first_impression,
        r.captured_at, r.latitude, r.longitude,
        r.photo_link,
      ]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadXLSX(rows: ExportRow[], filename: string) {
  const data = rows.map((r) => ({
    NRP: r.nrp,
    Nama: r.name,
    Prodi: r.major,
    Status: r.status,
    "Asal Daerah": r.asal_daerah,
    Hobi: r.hobi,
    "First Impression": r.first_impression,
    "Captured At": r.captured_at,
    Latitude: r.latitude,
    Longitude: r.longitude,
    "Link Foto": r.photo_link,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  // Set column widths untuk Link Foto agar muat
  ws["!cols"] = [
    { wch: 14 }, // NRP
    { wch: 22 }, // Nama
    { wch: 28 }, // Prodi
    { wch: 12 }, // Status
    { wch: 22 }, // Asal Daerah
    { wch: 20 }, // Hobi
    { wch: 24 }, // First Impression
    { wch: 20 }, // Captured At
    { wch: 12 }, // Latitude
    { wch: 12 }, // Longitude
    { wch: 50 }, // Link Foto
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Roster");
  XLSX.writeFile(wb, filename);
}

export async function downloadAllPhotos(
  search: string,
  major: string,
  status: string,
  onProgress?: (current: number, total: number, fileName: string) => void,
): Promise<{ success: number; failed: number; total: number }> {
  const rows = await fetchAllEntries(search, major, status);
  const withPhotos = rows.filter((r) => r.photo_url && r.status === "Terkumpul");
  if (withPhotos.length === 0) {
    throw new Error("Tidak ada foto untuk didownload (filter mungkin kosong atau belum ada yang terkumpul)");
  }

  const zip = new JSZip();
  let success = 0;
  let failed = 0;

  for (let i = 0; i < withPhotos.length; i++) {
    const r = withPhotos[i];
    const safeName = sanitizeFileName(r.name);
    const ext = (() => {
      try {
        const url = new URL(r.photo_url, window.location.origin);
        const last = url.pathname.split("/").pop() || "";
        const m = last.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
        if (m) return `.${m[1].toLowerCase()}`;
      } catch {}
      const m2 = r.photo_url.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
      if (m2) return `.${m2[1].toLowerCase()}`;
      return ".jpg";
    })();
    const fileName = `${r.nrp}_${safeName}${ext}`;
    onProgress?.(i + 1, withPhotos.length, fileName);
    try {
      const res = await fetch(r.photo_url, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      zip.file(fileName, blob);
      success++;
    } catch {
      failed++;
      // tetap lanjut, jangan throw
    }
  }

  const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const ts = new Date().toISOString().slice(0, 10);
  const zipName = `foto-mahasiswa-${ts}.zip`;
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  // Juga download CSV mapping NRP_Nama -> Link Foto sebagai index
  // (opsional, sudah ada di export CSV/XLSX)

  return { success, failed, total: withPhotos.length };
}

export function downloadAll(
  format: "csv" | "xlsx",
  search: string,
  major: string,
  status: string,
) {
  const ts = new Date().toISOString().slice(0, 10);
  const filename = `roster-mahasiswa-${ts}.${format}`;
  return fetchAllEntries(search, major, status).then((rows) => {
    if (format === "csv") downloadCSV(rows, filename);
    else downloadXLSX(rows, filename);
  });
}
