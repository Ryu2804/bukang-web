import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, Upload, Video, ImageIcon, MapPin, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { getCurrentPosition, reverseGeocode } from "../../services/geocode";
import { applyOverlay, type GeotagInfo, type OverlayResult } from "../../services/overlay";

interface Props {
  onCaptured: (data: OverlayResult) => void;
}

type GeoStatus = "idle" | "locating" | "geocoding" | "drawing" | "done" | "error";

export default function PhotoUpload({ onCaptured }: Props) {
  const [mode, setMode] = useState<"upload" | "camera">("upload");
  const [rawPreview, setRawPreview] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [geoError, setGeoError] = useState("");
  const [geotag, setGeotag] = useState<GeotagInfo | null>(null);
  const [overlayPreview, setOverlayPreview] = useState<string | null>(null);
  const [overlayFile, setOverlayFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async () => {
    setMode("camera");
    resetAll();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert("Kamera tidak dapat diakses. Gunakan mode Upload.");
      setMode("upload");
    }
  };

  const processImage = async (file: File, previewUrl: string) => {
    setGeoStatus("locating");
    setGeoError("");

    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude } = pos.coords;

      setGeoStatus("geocoding");
      const geo = await reverseGeocode(latitude, longitude);
      const ts = new Date().toISOString();

      setGeoStatus("drawing");
      const result = await applyOverlay(previewUrl, file.name, {
        latitude,
        longitude,
        timestamp: ts,
        address: geo.address,
        heading: geo.heading,
      });

      setGeotag(result.geotag);
      setOverlayPreview(result.dataUrl);
      setOverlayFile(result.file);
      setGeoStatus("done");

      URL.revokeObjectURL(previewUrl);
    } catch (err) {
      setGeoError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setGeoStatus("error");
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = URL.createObjectURL(file);
      setRawFile(file);
      setRawPreview(url);
      stopCamera();
      processImage(file, url);
    }, "image/jpeg");
  };

  const handleFilePick = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) return;
    const url = URL.createObjectURL(file);
    setRawFile(file);
    setRawPreview(url);
    processImage(file, url);
  };

  const confirmPhoto = () => {
    if (!overlayFile || !overlayPreview || !geotag) return;
    setConfirmed(true);
    onCaptured({
      dataUrl: overlayPreview,
      file: overlayFile,
      geotag,
    });
  };

  const resetAll = () => {
    setRawPreview(null);
    setRawFile(null);
    setGeotag(null);
    setOverlayPreview(null);
    setOverlayFile(null);
    setGeoStatus("idle");
    setGeoError("");
    setConfirmed(false);
  };

  const isLoading = geoStatus === "locating" || geoStatus === "geocoding" || geoStatus === "drawing";

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-2">Ambil Foto</h2>
      <p className="text-sm text-gray-500 mb-4">
        Foto akan diberi overlay geotag & waktu secara otomatis
      </p>

      <div className="flex gap-1 mb-4 border rounded-lg p-1 bg-gray-100">
        <button
          onClick={() => { setMode("upload"); stopCamera(); resetAll(); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "upload" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Upload size={16} /> Upload
        </button>
        <button
          onClick={startCamera}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === "camera" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Video size={16} /> Kamera
        </button>
      </div>

      {/* ====== OVERLAYED PREVIEW ====== */}
      {overlayPreview && !confirmed && (
        <div className="space-y-4">
          <img src={overlayPreview} alt="Hasil" className="w-full rounded-lg border" />

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
              <CheckCircle size={18} />
              Overlay geotag berhasil ditambahkan
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div>
                <p className="text-xs text-gray-500">Lokasi</p>
                <p className="font-medium">{geotag?.heading}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Koordinat</p>
                <p className="font-mono text-xs">{geotag?.latitude.toFixed(6)}, {geotag?.longitude.toFixed(6)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Alamat</p>
                <p className="text-xs">{geotag?.address}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={confirmPhoto}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 text-sm font-medium"
              >
                Gunakan Foto Ini
              </button>
              <button onClick={resetAll} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm">
                Ulang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== RAW PREVIEW WHILE PROCESSING ====== */}
      {rawPreview && !overlayPreview && (
        <div className="space-y-3">
          <img src={rawPreview} alt="Preview" className="w-full max-h-72 object-contain rounded-lg border" />

          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg py-4">
              <Loader2 size={22} className="animate-spin" />
              <span>
                {geoStatus === "locating" && "Mendapatkan lokasi..."}
                {geoStatus === "geocoding" && "Membaca alamat..."}
                {geoStatus === "drawing" && "Menambahkan overlay..."}
              </span>
            </div>
          )}

          {geoStatus === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
                <AlertCircle size={18} />
                Gagal mendapatkan lokasi
              </div>
              <p className="text-xs text-red-600">{geoError}</p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => processImage(rawFile!, rawPreview!)}
                  className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 text-sm"
                >
                  Coba Lagi
                </button>
                <button onClick={resetAll} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm">
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== CONFIRMED STATE ====== */}
      {overlayPreview && confirmed && (
        <div className="space-y-3">
          <div className="relative">
            <img src={overlayPreview} alt="Hasil" className="w-full rounded-lg border" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 rounded-b-lg">
              <div className="flex items-center gap-1 text-white text-xs">
                <MapPin size={12} />
                {geotag && `${geotag.latitude.toFixed(6)}, ${geotag.longitude.toFixed(6)}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium justify-center">
            <CheckCircle size={16} />
            Foto & data geotag siap
          </div>
        </div>
      )}

      {/* ====== CAMERA VIEW ====== */}
      {!rawPreview && mode === "camera" && (
        <div className="space-y-3">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="w-full max-h-80 object-contain" />
          </div>
          <button
            onClick={captureFrame}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
          >
            <Camera size={20} /> Ambil Foto
          </button>
        </div>
      )}

      {/* ====== UPLOAD VIEW ====== */}
      {!rawPreview && mode === "upload" && (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFilePick(f); }}
          />
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ImageIcon size={28} className="text-blue-500" />
          </div>
          <p className="font-medium">Klik untuk pilih foto</p>
          <p className="text-sm text-gray-400 mt-1">Foto akan diberi overlay geotag & waktu</p>
        </div>
      )}
    </div>
  );
}
