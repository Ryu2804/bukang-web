import { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, Loader2, MapPin, Globe } from "lucide-react";
import { apiUrl, authFetch } from "../../services/api";
import { normalizeHometown, parseHometown } from "../../utils/location";
import { searchOSM, type OSMLocation } from "../../services/osm";

interface FormData {
  asalDaerah: string;
  hobi: string[];
  firstImpression: string;
}

interface Props {
  initialNrp?: string;
  initialForm?: FormData;
  onResolved: (data: { nrp: string; name: string; major: string }) => void;
  onFormChange: (data: FormData) => void;
  onNext: () => void;
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

export default function StudentForm({
  initialNrp,
  initialForm,
  onResolved,
  onFormChange,
  onNext,
}: Props) {
  const [nrp, setNrp] = useState(initialNrp ?? "");
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [asalDaerah, setAsalDaerah] = useState(() =>
    initialForm?.asalDaerah ? normalizeHometown(initialForm.asalDaerah) : ""
  );
  const [hobi, setHobi] = useState<string[]>(initialForm?.hobi ?? []);
  const [firstImpression, setFirstImpression] = useState(initialForm?.firstImpression ?? "");
  const [hobiInput, setHobiInput] = useState("");
  const [showHobiSuggestions, setShowHobiSuggestions] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nrpError, setNrpError] = useState("");
  const [nrpResolved, setNrpResolved] = useState(false);
  const [osmSuggestions, setOsmSuggestions] = useState<OSMLocation[]>([]);
  const [osmLoading, setOsmLoading] = useState(false);
  const osmDebounceRef = useRef<number | null>(null);

  const parsedLocation = useMemo(() => parseHometown(asalDaerah), [asalDaerah]);
  // Hybrid OSM: debounced search ke Nominatim (backend proxy + direct), fallback statis otomatis di searchOSM
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

  const hobiSuggestions = HOBI_OPTIONS.filter(
    (h) => h.toLowerCase().includes(hobiInput.toLowerCase()) && !hobi.includes(h)
  );

  const handleLookupNrp = async () => {
    if (!nrp.trim()) return;
    setLoading(true);
    setNrpError("");

    try {
      const res = await authFetch(apiUrl(`/students/nrp/${nrp}`));
      const body = await res.json();

      if (!body.success) {
        setNrpError("NRP tidak ditemukan di database");
        setName("");
        setMajor("");
        setNrpResolved(false);
        return;
      }

      setName(body.data.name);
      setMajor(body.data.major);
      setNrpResolved(true);
      onResolved({ nrp, name: body.data.name, major: body.data.major });
    } catch {
      setNrpError("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    onFormChange({ asalDaerah, hobi, firstImpression });
  }, [asalDaerah, hobi, firstImpression]);

  useEffect(() => {
    if (initialNrp) handleLookupNrp();
  }, []);

  const handleSelectLocation = (label: string) => {
    setAsalDaerah(label);
    setShowLocationSuggestions(false);
  };

  const handleLocationBlur = () => {
    setTimeout(() => setShowLocationSuggestions(false), 200);
    const normalized = normalizeHometown(asalDaerah);
    if (normalized !== asalDaerah) setAsalDaerah(normalized);
  };

  const addHobi = (h: string) => {
    if (!hobi.includes(h)) {
      const next = [...hobi, h];
      setHobi(next);
    }
    setHobiInput("");
    setShowHobiSuggestions(false);
  };

  const removeHobi = (h: string) => {
    setHobi(hobi.filter((v) => v !== h));
  };

  const canSubmit =
    nrpResolved && asalDaerah.trim() && hobi.length > 0 && firstImpression.trim();

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-2">Data Profil</h2>
      <p className="text-sm text-gray-500 mb-4">
        Lengkapi data diri Anda
      </p>

      {/* NRP */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          NRP
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={nrp}
            onChange={(e) => {
              setNrp(e.target.value);
              setNrpResolved(false);
              setName("");
              setMajor("");
              setNrpError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || (e as any).keyCode === 13) {
                e.preventDefault();
                handleLookupNrp();
              }
            }}
            placeholder="Masukkan NRP"
            enterKeyHint="search"
            inputMode="numeric"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleLookupNrp}
            disabled={loading || !nrp.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1 text-sm min-h-[42px] min-w-[72px] justify-center"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            Cari
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">Tekan Enter untuk cari — optimal di HP</p>
        {nrpError && (
          <p className="text-red-500 text-xs mt-1">{nrpError}</p>
        )}
      </div>

      {/* Name + Major (read-only) */}
      {nrpResolved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-500">Nama</p>
              <p className="font-medium text-sm">{name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Program Studi</p>
              <p className="font-medium text-sm">{major}</p>
            </div>
          </div>
        </div>
      )}

      {/* Asal Daerah — Kota, Provinsi extended tag */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Asal Daerah
          <span className="ml-1 text-xs font-normal text-gray-400">(Kota, Provinsi)</span>
        </label>
        <div className="relative">
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
              placeholder="Ketik provinsi/kota: "
              enterKeyHint="search"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              className="w-full pl-9 pr-9 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[42px]"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {osmLoading ? (
                <Loader2 size={16} className="animate-spin text-blue-400" />
              ) : null}
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
            <div className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-56 overflow-y-auto">
              {osmLoading && osmSuggestions.length === 0 && (
                <div className="px-3 py-3 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 size={14} className="animate-spin" /> Mencari di OpenStreetMap...
                </div>
              )}
              {osmSuggestions.map((loc) => (
                <button
                  key={`${loc.label}-${loc.lat}-${loc.lon}`}
                  type="button"
                  onMouseDown={() => handleSelectLocation(loc.label)}
                  className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-start gap-2.5"
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
              <div className="px-3 py-1.5 bg-gray-50 text-[11px] text-gray-400 border-t flex items-center justify-between">
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

      {/* Hobi — optimal HP: Enter langsung tambah */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Hobi <span className="text-xs font-normal text-gray-400">(ketik lalu Enter)</span>
        </label>
        <div className="relative">
          <div className="flex gap-2">
            <input
              type="text"
              value={hobiInput}
              onChange={(e) => {
                setHobiInput(e.target.value);
                setShowHobiSuggestions(true);
              }}
              onFocus={() => setShowHobiSuggestions(true)}
              onBlur={() => setTimeout(() => setShowHobiSuggestions(false), 200)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || (e as any).keyCode === 13) {
                  e.preventDefault();
                  // Di HP, Enter = tambah. Jika ada saran, pakai saran pertama
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
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[42px]"
            />
            <button
              type="button"
              onClick={() => {
                if (hobiSuggestions.length > 0 && hobiInput.trim()) {
                  addHobi(hobiSuggestions[0]);
                  return;
                }
                const trimmed = hobiInput.trim();
                if (trimmed) addHobi(trimmed);
              }}
              className="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 min-h-[42px] min-w-[72px] justify-center flex items-center"
              aria-label="Tambah hobi"
            >
              Tambah
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Di HP: ketik hobi lalu tap Enter di keyboard</p>
          {showHobiSuggestions && hobiInput && hobiSuggestions.length > 0 && (
            <div className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
              {hobiSuggestions.map((h) => (
                <button
                  key={h}
                  onMouseDown={() => addHobi(h)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                >
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {hobi.map((h) => (
            <span
              key={h}
              className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1"
            >
              {h}
              <button onClick={() => removeHobi(h)} className="hover:text-red-500">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* First Impression */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          First Impression
        </label>
        <textarea
          value={firstImpression}
          onChange={(e) => setFirstImpression(e.target.value)}
          placeholder="Kesan pertama Anda..."
          rows={3}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <button
        onClick={onNext}
        disabled={!canSubmit}
        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        Lanjutkan
      </button>
    </div>
  );
}
