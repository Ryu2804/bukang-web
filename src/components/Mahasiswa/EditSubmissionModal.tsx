import { useEffect, useState, useMemo, useRef } from "react";
import { X, Loader2, Trash2, Save, ImageIcon, MapPin, AlertCircle, CheckCircle, Globe, Download, Maximize2, Calendar, Cake } from "lucide-react";
import { apiUrl, authFetch } from "../../services/api";
import PhotoUpload from "../Capture/PhotoUpload";
import type { OverlayResult } from "../../services/overlay";
import { normalizeHometown, parseHometown } from "../../utils/location";
import { searchOSM, type OSMLocation } from "../../services/osm";
import ImageLightbox, { downloadImage } from "../ImageLightbox";

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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entry: RosterEntry | null;
  onSuccess: () => void;
}

interface SubmissionDetail {
  id: string;
  nrp: string;
  name: string;
  major: string;
  hometown: string;
  hobbies: string;
  first_impression: string;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  photo_url: string;
  longitude: number;
  latitude: number;
  captured_at: string;
}

const HOBI_OPTIONS = [
  "Membaca",
  "Menulis",
  "Olahraga",
  "Musik",
  "Game",
  "Fotografi",
  "Memasak",
  "Traveling",
  "Berkebun",
  "Seni",
  "Teknologi",
  "Film",
  "Voli",
  "Basket",
  "Badminton",
  "Renang",
];

export default function EditSubmissionModal({ isOpen, onClose, entry, onSuccess }: Props) {
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [, setDetail] = useState<SubmissionDetail | null>(null);
  const [fetchError, setFetchError] = useState("");

  // form state
  const [asalDaerah, setAsalDaerah] = useState("");
  const [tempatLahir, setTempatLahir] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [hobi, setHobi] = useState<string[]>([]);
  const [firstImpression, setFirstImpression] = useState("");
  const [hobiInput, setHobiInput] = useState("");
  const [showHobiSuggestions, setShowHobiSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [osmSuggestions, setOsmSuggestions] = useState<OSMLocation[]>([]);
  const [osmLoading, setOsmLoading] = useState(false);
  const osmDebounceRef = useRef<number | null>(null);

  const parsedLocation = useMemo(() => parseHometown(asalDaerah), [asalDaerah]);
  useEffect(() => {
    if (!asalDaerah.trim() || parseHometown(asalDaerah)) {
      setOsmSuggestions([]);
      setOsmLoading(false);
      return;
    }
    if (osmDebounceRef.current) window.clearTimeout(osmDebounceRef.current);
    setOsmLoading(true);
    osmDebounceRef.current = window.setTimeout(async () => {
      try {
        const results = await searchOSM(asalDaerah, 6);
        setOsmSuggestions(results);
      } finally {
        setOsmLoading(false);
      }
    }, 350);
    return () => {
      if (osmDebounceRef.current) window.clearTimeout(osmDebounceRef.current);
    };
  }, [asalDaerah]);

  // foto state
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [existingLat, setExistingLat] = useState<number | null>(null);
  const [existingLng, setExistingLng] = useState<number | null>(null);
  const [existingCapturedAt, setExistingCapturedAt] = useState<string | null>(null);
  const [newPhoto, setNewPhoto] = useState<OverlayResult | null>(null);
  const [showCapture, setShowCapture] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const hobiSuggestions = HOBI_OPTIONS.filter(
    (h) => h.toLowerCase().includes(hobiInput.toLowerCase()) && !hobi.includes(h)
  );

  // Fetch detail when modal opens
  useEffect(() => {
    if (!isOpen || !entry?.submission_id) return;

    let cancelled = false;
    const fetchDetail = async () => {
      setLoadingDetail(true);
      setFetchError("");
      try {
        const res = await authFetch(apiUrl(`/students/submissions/${entry.submission_id}`));
        const body = await res.json();
        if (!body.success) throw new Error(body.data?.detail || "Gagal memuat data");
        const sub: SubmissionDetail = body.data;
        if (cancelled) return;
        setDetail(sub);
        setAsalDaerah(normalizeHometown(sub.hometown || "") || "");
        setTempatLahir(sub.tempat_lahir || "");
        setTanggalLahir(sub.tanggal_lahir ? sub.tanggal_lahir.slice(0, 10) : "");
        setHobi(sub.hobbies ? sub.hobbies.split(",").map((s) => s.trim()).filter(Boolean) : []);
        setFirstImpression(sub.first_impression || "");
        setExistingPhotoUrl(sub.photo_url || entry.photo_url || null);
        setExistingLat(sub.latitude ?? entry.latitude ?? null);
        setExistingLng(sub.longitude ?? entry.longitude ?? null);
        setExistingCapturedAt(sub.captured_at || entry.captured_at || null);
        setNewPhoto(null);
        setShowCapture(false);
        setError("");
        setShowDeleteConfirm(false);
      } catch (err) {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : "Gagal memuat data");
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    };
    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [isOpen, entry?.submission_id, entry?.photo_url, entry?.latitude, entry?.longitude, entry?.captured_at]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setDetail(null);
      setNewPhoto(null);
      setShowCapture(false);
      setError("");
      setFetchError("");
      setShowDeleteConfirm(false);
      setAsalDaerah("");
      setTempatLahir("");
      setTanggalLahir("");
      setHobi([]);
      setFirstImpression("");
    }
  }, [isOpen]);

  if (!isOpen || !entry) return null;

  const displayPhoto = newPhoto ? newPhoto.dataUrl : existingPhotoUrl;
  const displayLat = newPhoto ? newPhoto.geotag.latitude : existingLat;
  const displayLng = newPhoto ? newPhoto.geotag.longitude : existingLng;
  const hasPhoto = !!displayPhoto;

  const canSave =
    asalDaerah.trim() && tempatLahir.trim() && tanggalLahir.trim() && hobi.length > 0 && firstImpression.trim() && hasPhoto && !saving && !deleting;

  const addHobi = (h: string) => {
    if (!hobi.includes(h)) setHobi([...hobi, h]);
    setHobiInput("");
    setShowHobiSuggestions(false);
  };

  const removeHobi = (h: string) => setHobi(hobi.filter((v) => v !== h));

  const handleSelectLocation = (label: string) => {
    setAsalDaerah(label);
    setShowLocationSuggestions(false);
  };

  const handleLocationBlur = () => {
    setTimeout(() => setShowLocationSuggestions(false), 200);
    const normalized = normalizeHometown(asalDaerah);
    if (normalized !== asalDaerah) setAsalDaerah(normalized);
  };

  const handleSave = async () => {
    if (!entry.submission_id || !canSave) return;
    setSaving(true);
    setError("");

    try {
      let photoUrl = existingPhotoUrl || "";
      let latitude = existingLat;
      let longitude = existingLng;
      let capturedAt = existingCapturedAt;

      // If new foto selected, upload first
      if (newPhoto) {
        const formData = new FormData();
        formData.append("file", newPhoto.file);

        const uploadRes = await authFetch(apiUrl("/students/upload-photo"), {
          method: "POST",
          body: formData,
        });
        const uploadBody = await uploadRes.json();
        if (!uploadBody.success) {
          throw new Error(uploadBody.data?.detail || "Upload foto gagal");
        }
        photoUrl = uploadBody.data.photo_url;
        latitude = newPhoto.geotag.latitude;
        longitude = newPhoto.geotag.longitude;
        capturedAt = newPhoto.geotag.timestamp;
      }

      // Validate required foto fields for update
      if (!photoUrl) throw new Error("Foto wajib ada. Silakan ganti foto terlebih dahulu.");
      if (latitude == null || longitude == null || !capturedAt) {
        throw new Error("Data geotag foto tidak lengkap. Silakan ganti foto.");
      }

      const payload = {
        nrp: entry.nrp,
        asal_daerah: normalizeHometown(asalDaerah.trim()),
        hobi,
        first_impression: firstImpression.trim(),
        tempat_lahir: tempatLahir.trim(),
        tanggal_lahir: tanggalLahir,
        longitude,
        latitude,
        captured_at: capturedAt,
        photo_url: photoUrl,
      };

      const res = await authFetch(apiUrl(`/students/submissions/${entry.submission_id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!body.success) throw new Error(body.data?.detail || "Gagal menyimpan perubahan");

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry.submission_id) return;
    setDeleting(true);
    setError("");
    try {
      const res = await authFetch(apiUrl(`/students/submissions/${entry.submission_id}`), {
        method: "DELETE",
      });
      const body = await res.json();
      if (!body.success) throw new Error(body.data?.detail || "Gagal menghapus data");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCaptured = (data: OverlayResult) => {
    setNewPhoto(data);
    setShowCapture(false);
  };

  return (
    <>
      <ImageLightbox
        src={displayPhoto || ""}
        alt={`${entry.nrp} - ${entry.name}`}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        fileName={`${entry.nrp}-${entry.name.replace(/\s+/g, "_")}.jpg`}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b flex items-start justify-between gap-4 bg-white">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Edit Data Mahasiswa</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-mono font-medium text-gray-700">{entry.nrp}</span> — {entry.name}
            </p>
            <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
              {entry.major}
            </span>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
          {loadingDetail ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={28} className="animate-spin text-blue-500" />
              <p className="text-sm text-gray-500">Memuat data...</p>
            </div>
          ) : fetchError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Gagal memuat</p>
                <p className="text-sm text-red-600 mt-1">{fetchError}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Foto Section - Core fix for buggy update */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">Foto & Geotag</label>

                {showCapture ? (
                  <div className="space-y-3">
                    <PhotoUpload onCaptured={handleCaptured} />
                    <button
                      onClick={() => setShowCapture(false)}
                      className="w-full py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Batal Ganti Foto
                    </button>
                  </div>
                ) : (
                  <>
                    {displayPhoto ? (
                      <div className="space-y-3">
                        <div className="relative rounded-xl overflow-hidden border bg-gray-50 group">
                          <button
                            onClick={() => setLightboxOpen(true)}
                            className="block w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Lihat foto fullscreen"
                          >
                            <img
                              src={displayPhoto}
                              alt="Foto mahasiswa"
                              className="w-full max-h-[320px] object-contain bg-black group-hover:brightness-95 transition"
                            />
                          </button>
                          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end justify-center pb-3">
                            <span className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur">
                              <Maximize2 size={12} /> Tap untuk lihat full
                            </span>
                          </div>
                          <button
                            onClick={async () => {
                              setDownloading(true);
                              await downloadImage(displayPhoto, `${entry.nrp}-${entry.name.replace(/\s+/g, "_")}.jpg`);
                              setDownloading(false);
                            }}
                            disabled={downloading}
                            className="absolute top-3 left-3 bg-white/90 hover:bg-white text-gray-800 px-3 py-1.5 rounded-full text-xs font-medium shadow flex items-center gap-1.5 disabled:opacity-50 backdrop-blur"
                          >
                            {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                            Download
                          </button>
                          {newPhoto && (
                            <span className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                              <CheckCircle size={12} /> Foto Baru
                            </span>
                          )}
                          {!newPhoto && existingPhotoUrl && (
                            <span className="absolute top-3 left-3 bg-gray-900/70 text-white text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur">
                              Foto Saat Ini
                            </span>
                          )}
                        </div>

                        {displayLat != null && displayLng != null && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border">
                            <MapPin size={14} className="text-gray-400" />
                            <span className="font-mono">
                              {displayLat.toFixed(6)}, {displayLng.toFixed(6)}
                            </span>
                            {newPhoto && <span className="ml-auto text-green-600 font-medium">• Geotag baru</span>}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowCapture(true)}
                            className="flex-1 bg-blue-500 text-white py-2.5 rounded-xl hover:bg-blue-600 text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <ImageIcon size={16} /> {newPhoto ? "Ganti Lagi" : "Ganti Foto"}
                          </button>
                          {newPhoto && (
                            <button
                              onClick={() => setNewPhoto(null)}
                              className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                              Batal
                            </button>
                          )}
                        </div>
                        {newPhoto && (
                          <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            Foto baru akan diupload saat menyimpan. Foto lama tetap tersimpan sampai update berhasil.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-xl p-6 text-center bg-gray-50/50">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <ImageIcon size={20} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">Belum ada foto</p>
                        <p className="text-xs text-gray-500 mt-1">Wajib upload foto untuk menyimpan</p>
                        <button
                          onClick={() => setShowCapture(true)}
                          className="mt-4 bg-blue-500 text-white px-5 py-2 rounded-xl hover:bg-blue-600 text-sm font-medium"
                        >
                          Upload Foto
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Asal Daerah * <span className="text-xs font-normal text-gray-400">(Kota, Provinsi)</span>
                  </label>
                  <div className="relative">
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={asalDaerah}
                        onChange={(e) => {
                          setAsalDaerah(e.target.value);
                          setShowLocationSuggestions(true);
                        }}
                        onFocus={() => setShowLocationSuggestions(true)}
                        onBlur={handleLocationBlur}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || (e as any).keyCode === 13) && osmSuggestions.length > 0) {
                            e.preventDefault();
                            handleSelectLocation(osmSuggestions[0].label);
                          }
                          if (e.key === "Escape") setShowLocationSuggestions(false);
                        }}
                        placeholder="Ketik provinsi/kota: Riau → Pekanbaru, Riau (OSM)"
                        enterKeyHint="search"
                        inputMode="text"
                        autoComplete="off"
                        autoCapitalize="off"
                        autoCorrect="off"
                        className="w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {osmLoading ? <Loader2 size={16} className="animate-spin text-blue-400" /> : null}
                        {asalDaerah ? (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setAsalDaerah("");
                              setOsmSuggestions([]);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={16} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {showLocationSuggestions && (osmSuggestions.length > 0 || osmLoading) && (
                      <div className="absolute z-20 w-full bg-white border rounded-xl mt-1.5 shadow-xl max-h-56 overflow-y-auto">
                        {osmLoading && osmSuggestions.length === 0 && (
                          <div className="px-3.5 py-3 flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 size={14} className="animate-spin" /> Mencari di OpenStreetMap...
                          </div>
                        )}
                        {osmSuggestions.map((loc) => (
                          <button
                            key={`${loc.label}-${loc.lat}-${loc.lon}`}
                            type="button"
                            onMouseDown={() => handleSelectLocation(loc.label)}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 flex items-start gap-2.5 first:rounded-t-xl last:rounded-b-xl"
                          >
                            <span className="mt-0.5 bg-blue-100 text-blue-600 rounded-full p-1">
                              <MapPin size={12} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-gray-900">{loc.label}</span>
                              <span className="block text-xs text-gray-500 truncate">
                                {loc.city} · Provinsi {loc.province}
                                {loc.displayName && loc.displayName !== loc.label ? ` · ${loc.displayName.slice(0, 60)}` : ""}
                              </span>
                            </span>
                            <span className="shrink-0 mt-1 text-[10px] text-gray-400 flex items-center gap-1">
                              <Globe size={10} /> OSM
                            </span>
                          </button>
                        ))}
                        <div className="px-3.5 py-1.5 bg-gray-50 text-[11px] text-gray-400 border-t flex items-center justify-between">
                          <span>Pilih untuk isi otomatis “Kota, Provinsi”</span>
                          <span className="flex items-center gap-1">
                            <Globe size={10} /> © OpenStreetMap
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {parsedLocation ? (
                    <div className="mt-2 flex items-start gap-2">
                      <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-full font-medium shadow-sm">
                        <MapPin size={12} />
                        {parsedLocation.label}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {parsedLocation.city} · Provinsi {parsedLocation.province}
                      </span>
                    </div>
                  ) : asalDaerah.trim() ? (
                    <p className="text-xs text-gray-400 mt-1.5">
                      Tips: ketik nama provinsi (contoh: <em>Riau</em>) → akan jadi{" "}
                      <span className="font-medium text-gray-600">Pekanbaru, Riau</span>
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1.5">
                      Contoh: <span className="font-medium">Riau</span> → otomatis <span className="font-medium">Pekanbaru, Riau</span> (Kota, Provinsi)
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tempat Lahir *</label>
                    <div className="relative">
                      <Cake size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={tempatLahir}
                        onChange={(e) => setTempatLahir(e.target.value)}
                        placeholder="Contoh: Surabaya"
                        className="w-full pl-10 pr-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal Lahir *</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="date"
                        value={tanggalLahir}
                        onChange={(e) => setTanggalLahir(e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                        className="w-full pl-10 pr-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Hobi * <span className="text-xs font-normal text-gray-400">(Enter untuk tambah)</span></label>
                  <div className="relative">
                    <input
                      type="text"
                      value={hobiInput}
                      onChange={(e) => {
                        setHobiInput(e.target.value);
                        setShowHobiSuggestions(true);
                      }}
                      onFocus={() => setShowHobiSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowHobiSuggestions(false), 180)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || (e as any).keyCode === 13) {
                          e.preventDefault();
                          if (hobiSuggestions.length > 0 && hobiInput.trim()) {
                            addHobi(hobiSuggestions[0]);
                          } else {
                            const trimmed = hobiInput.trim();
                            if (trimmed) addHobi(trimmed);
                          }
                        }
                      }}
                      placeholder="Ketik hobi lalu Enter"
                      enterKeyHint="done"
                      inputMode="text"
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20 min-h-[44px]"
                    />
                    <button
                      onClick={() => {
                        if (hobiSuggestions.length > 0 && hobiInput.trim()) {
                          addHobi(hobiSuggestions[0]);
                          return;
                        }
                        const t = hobiInput.trim();
                        if (t) addHobi(t);
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-600 min-h-[36px]"
                    >
                      Tambah
                    </button>
                    {showHobiSuggestions && hobiInput && hobiSuggestions.length > 0 && (
                      <div className="absolute z-20 w-full bg-white border rounded-xl mt-1.5 shadow-xl max-h-40 overflow-y-auto">
                        {hobiSuggestions.map((h) => (
                          <button
                            key={h}
                            onMouseDown={() => addHobi(h)}
                            className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-blue-50 first:rounded-t-xl last:rounded-b-xl"
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {hobi.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">Belum ada hobi — minimal 1</span>
                    ) : (
                      hobi.map((h) => (
                        <span
                          key={h}
                          className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 font-medium border border-blue-200"
                        >
                          {h}
                          <button onClick={() => removeHobi(h)} className="hover:text-red-600 rounded-full p-0.5 hover:bg-blue-200">
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First Impression *</label>
                  <textarea
                    value={firstImpression}
                    onChange={(e) => setFirstImpression(e.target.value)}
                    rows={3}
                    placeholder="Kesan pertama..."
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-2.5">
                  <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Delete confirm inline */}
              {showDeleteConfirm && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-amber-800">Hapus data ini?</p>
                  <p className="text-xs text-amber-700">
                    Data <span className="font-mono font-bold">{entry.nrp}</span> akan dihapus permanen dan status kembali menjadi &quot;Belum Terkumpul&quot;. Foto yang sudah diupload tidak akan terhapus dari storage tapi tidak lagi tertaut.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 bg-red-600 text-white py-2 rounded-xl hover:bg-red-700 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      {deleting ? "Menghapus..." : "Ya, Hapus"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="flex-1 bg-white border border-gray-300 py-2 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700 disabled:opacity-50"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-t bg-gray-50 flex gap-3">
          {!loadingDetail && !fetchError && !showCapture && (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting}
                className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 text-sm font-medium flex items-center gap-2 disabled:opacity-50 bg-white"
              >
                <Trash2 size={16} /> Hapus
              </button>
              <button
                onClick={onClose}
                disabled={saving || deleting}
                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-white text-sm font-medium text-gray-700 disabled:opacity-50 bg-white"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2 shadow-sm"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </>
          )}
          {(loadingDetail || fetchError || showCapture) && (
            <button
              onClick={onClose}
              className="flex-1 bg-white border border-gray-300 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700"
            >
              Tutup
            </button>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
