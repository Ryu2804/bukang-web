import { useEffect, useState, useCallback } from "react";
import { X, Download, Loader2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface Props {
  src: string | null;
  alt?: string;
  open: boolean;
  onClose: () => void;
  fileName?: string;
}

export default function ImageLightbox({ src, alt = "Foto", open, onClose, fileName }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [scale, setScale] = useState(1);

  const handleDownload = useCallback(async () => {
    if (!src) return;
    setDownloading(true);
    try {
      // Fetch as blob untuk handle cross-origin (HF storage) dan relative /uploads
      const res = await fetch(src, { mode: "cors" });
      if (!res.ok) throw new Error("Gagal fetch");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      // Tentukan nama file dari src atau fileName
      let name = fileName || "foto-bukang.jpg";
      try {
        const u = new URL(src, window.location.origin);
        const last = u.pathname.split("/").pop();
        if (last && last.includes(".")) name = last;
      } catch {
        // ignore
      }
      if (!name.includes(".")) name += ".jpg";
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // Fallback: buka di tab baru jika fetch gagal karena CORS
      window.open(src, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
  }, [src, fileName]);

  const resetZoom = useCallback(() => setScale(1), []);

  useEffect(() => {
    if (!open) {
      setScale(1);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(3, s + 0.25));
      if (e.key === "-") setScale((s) => Math.max(0.5, s - 0.25));
      if (e.key === "0") resetZoom();
    };
    window.addEventListener("keydown", onKey);
    // cegah scroll body
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, resetZoom]);

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau foto fullscreen"
    >
      {/* Top bar */}
      <div
        className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
            <Maximize2 size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{fileName || alt}</p>
            <p className="text-xs text-white/60 truncate">Tap gambar untuk zoom • Pinch untuk zoom di HP</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-full p-1">
            <button
              onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
              className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-mono min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale((s) => Math.min(3, s + 0.25))}
              className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-white text-black px-3 py-1.5 rounded-full text-sm font-medium hover:bg-gray-100 flex items-center gap-1.5 disabled:opacity-50 min-h-[36px]"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center p-4 overflow-auto"
        onClick={onClose}
      >
        <img
          src={src}
          alt={alt}
          onClick={(e) => {
            e.stopPropagation();
            // tap to toggle zoom 1x ↔ 2x di HP
            setScale((s) => (s === 1 ? 2 : 1));
          }}
          style={{ transform: `scale(${scale})` }}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl transition-transform duration-200 will-change-transform select-none"
          draggable={false}
        />
      </div>

      {/* Bottom bar */}
      <div
        className="shrink-0 px-4 py-3 flex items-center justify-center gap-2 text-white/70 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="hidden sm:inline">Gunakan Esc untuk tutup • +/- untuk zoom • 0 untuk reset</span>
        <span className="sm:hidden">Tap gambar untuk zoom • Swipe untuk tutup</span>
        <span className="mx-2 opacity-30">|</span>
        <button onClick={resetZoom} className="hover:text-white underline">Reset 100%</button>
        <span className="mx-2 opacity-30">|</span>
        <button onClick={handleDownload} className="hover:text-white flex items-center gap-1">
          <Download size={12} /> Download
        </button>
      </div>
    </div>
  );
}

// Helper download langsung tanpa lightbox (untuk tombol Download di card)
export async function downloadImage(src: string, fileName?: string) {
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    let name = fileName || "foto-bukang.jpg";
    try {
      const u = new URL(src, window.location.origin);
      const last = u.pathname.split("/").pop();
      if (last && last.includes(".")) name = last;
    } catch {}
    if (!name.includes(".")) name += ".jpg";
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    window.open(src, "_blank", "noopener");
    return false;
  }
}
