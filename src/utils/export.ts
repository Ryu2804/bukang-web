import * as XLSX from "xlsx";
import { apiUrl } from "../services/api";

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
}

export async function fetchAllEntries(
  search: string,
  major: string,
  status: string,
): Promise<ExportRow[]> {
  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const params = new URLSearchParams({ search, major, status, all: "true" });
  const res = await fetch(apiUrl(`/students/roster?${params}`), { headers });
  if (!res.ok) throw new Error("Gagal mengambil data");
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
  }));
}

export function downloadCSV(rows: ExportRow[], filename: string) {
  const headers = [
    "NRP", "Nama", "Prodi", "Status",
    "Asal Daerah", "Hobi", "First Impression",
    "Captured At", "Latitude", "Longitude",
  ];
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.nrp, r.name, r.major, r.status,
        r.asal_daerah, r.hobi, r.first_impression,
        r.captured_at, r.latitude, r.longitude,
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
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Roster");
  XLSX.writeFile(wb, filename);
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
