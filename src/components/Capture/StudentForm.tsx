import { useState, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface Props {
  initialNrp?: string;
  onResolved: (data: { nrp: string; name: string; major: string }) => void;
  onFormChange: (data: {
    asalDaerah: string;
    hobi: string[];
    firstImpression: string;
  }) => void;
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
  onResolved,
  onFormChange,
  onNext,
}: Props) {
  const [nrp, setNrp] = useState(initialNrp ?? "");
  const [name, setName] = useState("");
  const [major, setMajor] = useState("");
  const [asalDaerah, setAsalDaerah] = useState("");
  const [hobi, setHobi] = useState<string[]>([]);
  const [firstImpression, setFirstImpression] = useState("");
  const [hobiInput, setHobiInput] = useState("");
  const [showHobiSuggestions, setShowHobiSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nrpError, setNrpError] = useState("");
  const [nrpResolved, setNrpResolved] = useState(false);

  const hobiSuggestions = HOBI_OPTIONS.filter(
    (h) => h.toLowerCase().includes(hobiInput.toLowerCase()) && !hobi.includes(h)
  );

  const handleLookupNrp = async () => {
    if (!nrp.trim()) return;
    setLoading(true);
    setNrpError("");

    try {
      const token = localStorage.getItem("access_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/students/nrp/${nrp}`, { headers });
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
            placeholder="Masukkan NRP"
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleLookupNrp}
            disabled={loading || !nrp.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1 text-sm"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            Cari
          </button>
        </div>
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

      {/* Asal Daerah */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Asal Daerah
        </label>
        <input
          type="text"
          value={asalDaerah}
          onChange={(e) => setAsalDaerah(e.target.value)}
          placeholder="Contoh: Surabaya, Jawa Timur"
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Hobi */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Hobi
        </label>
        <div className="relative">
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
              if (e.key === "Enter" && hobiInput.trim()) {
                e.preventDefault();
                addHobi(hobiInput.trim());
              }
            }}
            placeholder="Ketik hobi lalu Enter"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
