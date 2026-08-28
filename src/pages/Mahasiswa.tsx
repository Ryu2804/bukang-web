import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import { Search, Grid3X3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, User, X, MapPin, Calendar, Heart, MessageCircle, Hash, FileDown, Loader2, Pencil, LogIn, Download, Maximize2, ChevronDown, FileSpreadsheet, Images, Cake } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import EditSubmissionModal from "../components/Mahasiswa/EditSubmissionModal";
import { downloadAll, downloadAllPhotos } from "../utils/export";
import { apiUrl, authFetch } from "../services/api";
import { parseHometown } from "../utils/location";
import { useAuth } from "../context/AuthContext";
import Breadcrumb from "../components/Breadcrumb";
import ImageLightbox, { downloadImage } from "../components/ImageLightbox";

interface RosterEntry {
  nrp: string;
  name: string;
  major: string;
  submitted: boolean;
  photo_url: string | null;
  hometown: string | null;
  hobbies: string | null;
  first_impression: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  submission_id: string | null;
  captured_at: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface RosterData {
  entries: RosterEntry[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  submitted_count: number;
}

const MAJORS = ["Teknik Informatika", "Rekayasa Perangkat Lunak", "Rekayasa Kecerdasan Artifisial"] as const;

const MAJOR_COLORS: Record<string, string> = {
  "Teknik Informatika": "bg-blue-100 text-blue-700 border-blue-200",
  "Rekayasa Perangkat Lunak": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Rekayasa Kecerdasan Artifisial": "bg-violet-100 text-violet-700 border-violet-200",
};

function majorStyle(major: string): string {
  return MAJOR_COLORS[major] || "bg-gray-100 text-gray-700 border-gray-200";
}

function MysteryCard() {
  return (
    <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-t-lg">
      <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
        <User size={36} className="text-gray-400" />
      </div>
    </div>
  );
}

const PhotoCard = memo(function PhotoCard({ url, name }: { url: string; name: string }) {
  return (
    <div className="aspect-[4/3] bg-gray-50 overflow-hidden rounded-t-lg">
      <img src={url} alt={name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
    </div>
  );
});

const EntryCard = memo(function EntryCard({ entry, onClick, onCapture }: { entry: RosterEntry; onClick: () => void; onCapture?: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className="bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col"
    >
      <div className={`border-b-2 ${entry.submitted ? "border-green-400" : "border-gray-200"}`}>
        {entry.submitted && entry.photo_url ? (
          <PhotoCard url={entry.photo_url} name={entry.name} />
        ) : (
          <MysteryCard />
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <p className="text-[11px] font-mono text-gray-400 tracking-wider">{entry.nrp}</p>
        <p className={`mt-1 font-semibold text-sm leading-snug ${entry.submitted ? "text-gray-800" : "text-gray-500"}`}>
          {entry.name}
        </p>
        <span className={`mt-1.5 self-start text-[10px] px-2 py-0.5 rounded-full border font-medium ${majorStyle(entry.major)}`}>
          {entry.major}
        </span>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${entry.submitted ? "bg-green-500" : "bg-gray-300"}`} />
            <span className={`text-[11px] font-medium ${entry.submitted ? "text-green-600" : "text-gray-400"}`}>
              {entry.submitted ? "Terkumpul" : "Belum"}
            </span>
          </div>
          {!entry.submitted && onCapture && (
            <button
              onClick={(e) => { e.stopPropagation(); onCapture(); }}
              className="text-xs bg-blue-500 text-white px-2.5 py-1 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Isi Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

function ProfileModal({ entry, onClose, onEdit }: { entry: RosterEntry; onClose: () => void; onEdit: (e: RosterEntry) => void }) {
  const coords = entry.latitude && entry.longitude
    ? `${entry.latitude.toFixed(6)}, ${entry.longitude.toFixed(6)}`
    : null;

  const captured = entry.captured_at
    ? new Date(entry.captured_at).toLocaleString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!entry.photo_url) return;
    setDownloading(true);
    await downloadImage(entry.photo_url, `${entry.nrp}-${entry.name.replace(/\s+/g, "_")}.jpg`);
    setDownloading(false);
  };

  return (
    <>
      <ImageLightbox
        src={entry.photo_url}
        alt={`${entry.name} - ${entry.nrp}`}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        fileName={`${entry.nrp}-${entry.name.replace(/\s+/g, "_")}.jpg`}
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Photo — tap untuk full */}
          <div className="relative group">
            {entry.submitted && entry.photo_url ? (
              <button
                onClick={() => setLightboxOpen(true)}
                className="block w-full relative focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t-2xl overflow-hidden"
                aria-label="Lihat foto fullscreen"
              >
                <img
                  src={entry.photo_url}
                  alt={entry.name}
                  className="w-full aspect-[4/3] object-cover group-hover:brightness-[0.92] transition-all"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                  <span className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur">
                    <Maximize2 size={12} /> Tap untuk lihat full
                  </span>
                </div>
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <span className="bg-black/60 text-white text-[11px] px-2 py-1 rounded-full backdrop-blur hidden sm:inline-flex items-center gap-1">
                    <Maximize2 size={10} /> Full
                  </span>
                </div>
              </button>
            ) : (
              <div className="w-full aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-t-2xl">
                <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center">
                  <User size={44} className="text-gray-400" />
                </div>
              </div>
            )}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur"
            >
              <X size={16} />
            </button>
            {entry.submitted && entry.photo_url && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                disabled={downloading}
                className="absolute top-3 left-3 bg-white/90 hover:bg-white text-gray-800 px-3 py-1.5 rounded-full text-xs font-medium shadow flex items-center gap-1.5 disabled:opacity-50 backdrop-blur"
              >
                {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                Download
              </button>
            )}
          </div>

        {/* Identity */}
        <div className="p-5">
          <h2 className="text-xl font-bold text-gray-900">{entry.name}</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <Hash size={14} />
            <span className="font-mono">{entry.nrp}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${majorStyle(entry.major)}`}>
              {entry.major}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              entry.submitted
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-gray-100 text-gray-500 border-gray-200"
            }`}>
              {entry.submitted ? "Terkumpul" : "Belum Terkumpul"}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {entry.submitted && entry.hometown && (() => {
              const parsed = parseHometown(entry.hometown);
              if (parsed) {
                return (
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 text-blue-500 shrink-0"><MapPin size={16} /></div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Asal Daerah</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-medium shadow-sm">
                          <MapPin size={12} /> {parsed.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{parsed.city} · Provinsi {parsed.province}</p>
                    </div>
                  </div>
                );
              }
              return <InfoRow icon={<MapPin size={16} />} label="Asal Daerah" value={entry.hometown} />;
            })()}
            {entry.submitted && entry.tempat_lahir && (
              <InfoRow icon={<Cake size={16} />} label="Tempat Lahir" value={entry.tempat_lahir} />
            )}
            {entry.submitted && entry.tanggal_lahir && (
              <InfoRow icon={<Calendar size={16} />} label="Tanggal Lahir" value={new Date(entry.tanggal_lahir).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} />
            )}
            {entry.submitted && entry.hobbies && (
              <InfoRow icon={<Heart size={16} />} label="Hobi" value={entry.hobbies} />
            )}
            {entry.submitted && entry.first_impression && (
              <InfoRow icon={<MessageCircle size={16} />} label="Kesan Pertama" value={entry.first_impression} />
            )}
            {captured && (
              <InfoRow icon={<Calendar size={16} />} label="Waktu Captured" value={captured} />
            )}
            {coords && (
              <InfoRow icon={<MapPin size={16} />} label="Koordinat" value={coords} />
            )}
          </div>

          {entry.submitted ? (
            <div className="mt-5 space-y-2">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                Download Foto
              </button>
              <button
                onClick={() => onEdit(entry)}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
              >
                <Pencil size={15} />
                Edit / Hapus Foto
              </button>
            </div>
          ) : (
            <div className="mt-5 p-3 bg-gray-50 rounded-lg text-center text-sm text-gray-400">
              Data diri belum terkumpul
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 text-gray-400 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-700 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

type StatusFilter = "" | "submitted" | "pending";

export default function Mahasiswa() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [majorFilter, setMajorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [selectedEntry, setSelectedEntry] = useState<RosterEntry | null>(null);
  const [editEntry, setEditEntry] = useState<RosterEntry | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | "photos" | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [photoProgress, setPhotoProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    if (exportOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [exportOpen]);

  const fetchRoster = useCallback(async (p: number, s: string, m: string, st: StatusFilter) => {
    // Jika sudah tidak auth, langsung arahkan ke halaman login/signup sendiri
    if (!isAuthenticated) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setUnauthorized(false);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: "20", search: s });
      if (m) params.set("major", m);
      if (st) params.set("status", st);
      const res = await authFetch(apiUrl(`/students/roster?${params}`));
      if (res.status === 401) {
        setUnauthorized(true);
        // Arahkan ke halaman auth dengan redirect balik ke /mahasiswa
        navigate(`/auth?redirect=${encodeURIComponent("/mahasiswa")}&reason=unauthorized`, { replace: true });
        return;
      }
      const body = await res.json();
      if (body.success && mountedRef.current) setData(body.data);
      else if (body.success === false && (body.data as any)?.detail?.toLowerCase?.().includes("unauthorized")) {
        setUnauthorized(true);
      }
    } catch {
      // ignore
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    fetchRoster(page, search, majorFilter, statusFilter);
  }, [page, search, majorFilter, statusFilter, fetchRoster]);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      setSearch(val);
    }, 300);
  };

  const setFilter = (setter: (v: any) => void) => (val: any) => {
    setPage(1);
    setter(val);
  };

  const handleExport = async (format: "csv" | "xlsx") => {
    setExporting(format);
    setExportOpen(false);
    try {
      await downloadAll(format, search, majorFilter, "submitted");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal export");
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadPhotos = async () => {
    setExporting("photos");
    setExportOpen(false);
    setPhotoProgress({ current: 0, total: 0, fileName: "" });
    try {
      const result = await downloadAllPhotos(search, majorFilter, "submitted", (cur, total, name) => {
        setPhotoProgress({ current: cur, total, fileName: name });
      });
      if (result.failed > 0) {
        alert(`Download selesai: ${result.success} berhasil, ${result.failed} gagal dari ${result.total} foto`);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal download foto");
    } finally {
      setExporting(null);
      setPhotoProgress(null);
    }
  };

  const totalPages = data?.total_pages ?? 0;
  const hasActiveFilters = majorFilter || statusFilter || search;

  const pageWindow = useMemo(() => {
    if (totalPages <= 1) return [];
    const pages: (number | "ellipsis")[] = [1];
    const side = 1;
    let rangeStart = Math.max(2, page - side);
    let rangeEnd = Math.min(totalPages - 1, page + side);
    if (page <= 3) rangeEnd = Math.min(totalPages - 1, 4);
    if (page >= totalPages - 2) rangeStart = Math.max(2, totalPages - 3);
    if (rangeStart > 2) pages.push("ellipsis");
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (rangeEnd < totalPages - 1) pages.push("ellipsis");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3 max-w-6xl">
          <Breadcrumb
            items={
              unauthorized
                ? [
                    { label: "Beranda", href: "/" },
                    { label: "Mahasiswa", href: "/mahasiswa", status: "active" },
                    { label: "Perlu Login", status: "error" },
                  ]
                : loading
                  ? [
                      { label: "Beranda", href: "/" },
                      { label: "Mahasiswa", status: "active" },
                      { label: "Memuat...", status: "active" },
                    ]
                  : data && data.submitted_count === data.total
                    ? [
                        { label: "Beranda", href: "/" },
                        { label: "Mahasiswa", status: "active" },
                        { label: "Semua Terkumpul", status: "success" },
                      ]
                    : [
                        { label: "Beranda", href: "/" },
                        { label: "Mahasiswa", status: "active" },
                      ]
            }
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Grid3X3 size={24} className="text-blue-500" />
            <h1 className="text-2xl font-bold">Mahasiswa</h1>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setMajorFilter("");
                setStatusFilter("");
                setPage(1);
              }}
              className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
            >
              <X size={14} />
              Hapus filter
            </button>
          )}
        </div>

        {data && (
          <div className="flex flex-wrap gap-3 mb-4 text-sm">
            <span className="bg-white px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
              <span className="text-gray-400">Total</span>
              <strong>{data.total}</strong>
            </span>
            <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Terkumpul <strong>{data.submitted_count}</strong>
            </span>
            <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 bg-gray-400 rounded-full" />
              Sisa <strong>{data.total - data.submitted_count}</strong>
            </span>
            <div className="ml-auto relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((o) => !o)}
                disabled={!!exporting}
                className="bg-blue-600 text-white border border-blue-600 px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 text-xs font-medium hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none min-h-[32px]"
              >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                <span className="hidden sm:inline">
                  {exporting === "photos" && photoProgress ? `Foto ${photoProgress.current}/${photoProgress.total}` : exporting ? "Memproses..." : "Export"}
                </span>
                <span className="sm:hidden">Export</span>
                <ChevronDown size={12} className={`transition-transform ${exportOpen ? "rotate-180" : ""}`} />
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border rounded-xl shadow-xl z-20 overflow-hidden">
                  <div className="px-3.5 py-2.5 bg-gray-50 border-b">
                    <p className="text-xs font-semibold text-gray-700">Export & Download</p>
                    <p className="text-[11px] text-gray-500">Semua pakai nama NRP_Nama & kolom Link Foto</p>
                  </div>
                  <button
                    onClick={() => handleExport("xlsx")}
                    disabled={!!exporting}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50 flex items-center gap-2.5 text-sm disabled:opacity-50"
                  >
                    <span className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                      <FileSpreadsheet size={16} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900">Export Excel</span>
                      <span className="block text-xs text-gray-500 truncate">.xlsx + kolom Link Foto</span>
                    </span>
                  </button>
                  <button
                    onClick={() => handleExport("csv")}
                    disabled={!!exporting}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 flex items-center gap-2.5 text-sm disabled:opacity-50"
                  >
                    <span className="w-9 h-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                      <FileDown size={16} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900">Export CSV</span>
                      <span className="block text-xs text-gray-500 truncate">.csv + kolom Link Foto</span>
                    </span>
                  </button>
                  <div className="border-t my-1" />
                  <button
                    onClick={handleDownloadPhotos}
                    disabled={!!exporting}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-violet-50 flex items-center gap-2.5 text-sm disabled:opacity-50"
                  >
                    <span className="w-9 h-9 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center shrink-0">
                      <Images size={16} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900">Download Semua Foto</span>
                      <span className="block text-xs text-gray-500 truncate">ZIP • Nama NRP_Nama.jpg</span>
                    </span>
                  </button>
                  {photoProgress && exporting === "photos" && (
                    <div className="px-3.5 py-2.5 bg-violet-50 border-t">
                      <p className="text-xs text-violet-700 font-medium">
                        Mengunduh {photoProgress.current}/{photoProgress.total}
                      </p>
                      <p className="text-[11px] text-violet-600 truncate">{photoProgress.fileName}</p>
                      <div className="w-full bg-violet-200 rounded-full h-1.5 mt-1.5">
                        <div
                          className="bg-violet-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${(photoProgress.current / photoProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="px-3 py-1.5 bg-gray-50 text-[11px] text-gray-400 border-t text-center">
                    Foto dinamai <span className="font-mono font-medium">NRP_Nama.jpg</span> • Kolom Link Foto di Excel/CSV
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchTimer.current) clearTimeout(searchTimer.current);
            setPage(1);
            setSearch(searchInput);
          }}
          className="relative max-w-md mb-3 flex gap-2"
        >
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchInput}
              onKeyDown={(e) => {
                if (e.key === "Enter" || (e as any).keyCode === 13) {
                  e.preventDefault();
                  if (searchTimer.current) clearTimeout(searchTimer.current);
                  setPage(1);
                  setSearch(searchInput);
                }
                if (e.key === "Escape") {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                }
              }}
              placeholder="Cari NRP atau nama..."
              enterKeyHint="search"
              inputMode="search"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              className="w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-h-[44px]"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                aria-label="Hapus pencarian"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium min-h-[44px] min-w-[64px] flex items-center justify-center gap-1.5 sm:hidden"
            aria-label="Cari"
          >
            <Search size={16} /> Cari
          </button>
          <button
            type="submit"
            className="hidden sm:flex px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium min-h-[44px] items-center gap-1.5"
          >
            <Search size={16} /> Cari
          </button>
        </form>
        <p className="text-[11px] text-gray-400 mb-3 sm:hidden">Di HP: ketik lalu tekan Enter / Cari</p>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-gray-400 font-medium mr-1">Status:</span>
          {([["", "Semua"], ["submitted", "Terkumpul"], ["pending", "Belum"]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(setStatusFilter)(val)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                statusFilter === val
                  ? val === "submitted"
                    ? "bg-green-500 text-white border-green-500"
                    : val === "pending"
                      ? "bg-gray-500 text-white border-gray-500"
                      : "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="text-xs text-gray-400 font-medium mx-2">Prodi:</span>
          {MAJORS.map((m) => (
            <button
              key={m}
              onClick={() => setFilter(setMajorFilter)(majorFilter === m ? "" : m)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                majorFilter === m
                  ? `${MAJOR_COLORS[m]} border-current`
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              {m === "Teknik Informatika" ? "IF" : m === "Rekayasa Perangkat Lunak" ? "RPL" : "RKA"}
            </button>
          ))}
        </div>

        {unauthorized && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn size={28} className="text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Login Diperlukan</h2>
            <p className="text-sm text-gray-500 mb-4">
              Silakan login untuk melihat data mahasiswa. Kamu akan diarahkan ke halaman login/signup.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate("/auth?redirect=%2Fmahasiswa&reason=unauthorized")}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 text-sm font-medium shadow-sm"
              >
                Login / Sign Up
              </button>
              <button
                onClick={() => navigate("/auth?redirect=%2Fmahasiswa&mode=signup&reason=unauthorized")}
                className="bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-medium"
              >
                Buat Akun Baru
              </button>
            </div>
          </div>
        )}

        {!unauthorized && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
                      <div className="aspect-[4/3] bg-gray-200" />
                      <div className="p-3 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                        <div className="h-3 bg-gray-200 rounded w-1/4" />
                      </div>
                    </div>
                  ))
                : data?.entries.map((entry) => (
                    <EntryCard key={entry.nrp} entry={entry} onClick={() => setSelectedEntry(entry)} onCapture={() => navigate(`/capture?nrp=${entry.nrp}`)} />
                  ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-8 mb-4">
                <button
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  title="Halaman pertama"
                  className="p-2 rounded-lg border hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1">
                  {pageWindow.map((p, i) =>
                    p === "ellipsis" ? (
                      <span key={`e-${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 select-none">
                        &hellip;
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium ${
                          p === page ? "bg-blue-500 text-white" : "border hover:bg-gray-100"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                </div>

                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  title="Halaman terakhir"
                  className="p-2 rounded-lg border hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {selectedEntry && (
        <ProfileModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onEdit={(e) => {
            setSelectedEntry(null);
            setEditEntry(e);
          }}
        />
      )}
      <EditSubmissionModal
        isOpen={!!editEntry}
        entry={editEntry}
        onClose={() => setEditEntry(null)}
        onSuccess={() => fetchRoster(page, search, majorFilter, statusFilter)}
      />
    </div>
  );
}
