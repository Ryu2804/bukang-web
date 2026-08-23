import { useState, useEffect } from "react";
import { ArrowLeft, Send, Pencil, CheckCircle2, Download, Maximize2, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PhotoUpload from "../components/Capture/PhotoUpload";
import StudentForm from "../components/Capture/StudentForm";
import type { OverlayResult } from "../services/overlay";
import { apiUrl, authFetch, authHeaders } from "../services/api";
import { normalizeHometown } from "../utils/location";
import { reverseOSM } from "../services/osm";
import { useAuth } from "../context/AuthContext";
import Breadcrumb, { buildCaptureBreadcrumb } from "../components/Breadcrumb";
import ImageLightbox, { downloadImage } from "../components/ImageLightbox";

interface StudentData {
  nrp: string;
  name: string;
  major: string;
}

interface FormData {
  asalDaerah: string;
  hobi: string[];
  firstImpression: string;
}

interface ExistingSubmission {
  id: string;
  nrp: string;
  name: string;
  major: string;
  hometown: string;
  hobbies: string;
  first_impression: string;
  photo_url: string;
  longitude: number;
  latitude: number;
  captured_at: string;
}

export default function Capture() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const initialNrp = searchParams.get("nrp") || "";
  const submissionId = searchParams.get("submission_id") || "";
  const isEditing = !!submissionId;

  // Jika unauthorized, ProtectedRoute sudah redirect, tapi jaga-jaga untuk token expiry saat di page
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/auth?redirect=${encodeURIComponent("/capture" + (initialNrp ? `?nrp=${initialNrp}` : ""))}&reason=unauthorized`, { replace: true });
    }
  }, [isAuthenticated, navigate, initialNrp]);

  const [step, setStep] = useState(isEditing ? 2 : 1);
  const [photo, setPhoto] = useState<OverlayResult | null>(null);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState("");
  const [existingLat, setExistingLat] = useState(0);
  const [existingLng, setExistingLng] = useState(0);
  const [existingCapturedAt, setExistingCapturedAt] = useState("");
  const [form, setForm] = useState<FormData>({
    asalDaerah: "",
    hobi: [],
    firstImpression: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [previewLightbox, setPreviewLightbox] = useState(false);
  const [downloadingPreview, setDownloadingPreview] = useState(false);

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      try {
        const res = await authFetch(apiUrl(`/students/submissions/${submissionId}`));
        if (res.status === 401) {
          navigate(`/auth?redirect=${encodeURIComponent(`/capture?submission_id=${submissionId}`)}&reason=unauthorized`, { replace: true });
          return;
        }
        const body = await res.json();
        if (!body.success) throw new Error(body.data?.detail || "Gagal memuat data");

        const sub: ExistingSubmission = body.data;
        setStudent({ nrp: sub.nrp, name: sub.name, major: sub.major });
        setForm({
          asalDaerah: sub.hometown || "",
          hobi: sub.hobbies ? sub.hobbies.split(",") : [],
          firstImpression: sub.first_impression || "",
        });
        setExistingPhotoUrl(sub.photo_url || "");
        setExistingLat(sub.latitude);
        setExistingLng(sub.longitude);
        setExistingCapturedAt(sub.captured_at);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data");
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [isEditing, submissionId]);

  const handlePhotoCaptured = async (data: OverlayResult) => {
    setPhoto(data);
    setStep(2);
    // OSM: auto-isi Asal Daerah dari koordinat foto jika masih kosong — langsung terintegrasi
    if (!form.asalDaerah.trim()) {
      try {
        const rev = await reverseOSM(data.geotag.latitude, data.geotag.longitude);
        if (rev?.label) {
          // rev.label sudah format Kota, Provinsi via OSM + normalize
          setForm((prev) => (prev.asalDaerah ? prev : { ...prev, asalDaerah: rev.label }));
        }
      } catch {
        // fallback: gunakan heading dari geotag (kota) kalau OSM gagal
        if (data.geotag.heading) {
          const fallback = normalizeHometown(data.geotag.heading);
          if (fallback) setForm((prev) => (prev.asalDaerah ? prev : { ...prev, asalDaerah: fallback }));
        }
      }
    }
  };

  const handleStudentResolved = (data: StudentData) => {
    setStudent(data);
  };

  const handleFormChange = (data: FormData) => {
    setForm(data);
  };

  const handleSubmit = async () => {
    if (!student) return;
    setSubmitting(true);
    setError("");

    try {
      const hdrs = authHeaders();

      let photoUrl = existingPhotoUrl;
      let longitude = existingLng;
      let latitude = existingLat;
      let capturedAt = existingCapturedAt;

      if (photo) {
        const formData = new FormData();
        formData.append("file", photo.file);

        const uploadRes = await authFetch(apiUrl("/students/upload-photo"), {
          method: "POST",
          headers: hdrs,
          body: formData,
        });
        if (uploadRes.status === 401) {
          navigate(`/auth?redirect=${encodeURIComponent("/capture" + (initialNrp ? `?nrp=${initialNrp}` : ""))}&reason=unauthorized`, { replace: true });
          return;
        }
        const uploadBody = await uploadRes.json();
        if (!uploadBody.success) {
          throw new Error(uploadBody.data?.detail || "Upload gagal");
        }
        photoUrl = uploadBody.data.photo_url;
        longitude = photo.geotag.longitude;
        latitude = photo.geotag.latitude;
        capturedAt = photo.geotag.timestamp;
      }

      const payload = {
        nrp: student.nrp,
        asal_daerah: normalizeHometown(form.asalDaerah),
        hobi: form.hobi,
        first_impression: form.firstImpression,
        longitude,
        latitude,
        captured_at: capturedAt,
        photo_url: photoUrl,
      };

      const endpoint = isEditing
        ? apiUrl(`/students/submissions/${submissionId}`)
        : apiUrl("/students/submissions");
      const method = isEditing ? "PUT" : "POST";

      const submitRes = await authFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", ...hdrs },
        body: JSON.stringify(payload),
      });
      if (submitRes.status === 401) {
        navigate(`/auth?redirect=${encodeURIComponent("/capture" + (initialNrp ? `?nrp=${initialNrp}` : ""))}&reason=unauthorized`, { replace: true });
        return;
      }
      const submitBody = await submitRes.json();
      if (!submitBody.success) {
        throw new Error(submitBody.data?.detail || "Gagal menyimpan data");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-4 max-w-2xl">
          <Breadcrumb items={buildCaptureBreadcrumb(step, isEditing, { status: "success" })} className="mb-4" />
        </div>
        <div className="flex items-center justify-center px-4">
          <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {isEditing ? <Pencil size={28} className="text-green-600" /> : <Send size={28} className="text-green-600" />}
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {isEditing ? "Data Berhasil Diperbarui!" : "Data Berhasil Dikirim!"}
            </h2>
            <p className="text-gray-600 mb-2">
              {isEditing ? "Perubahan data profil telah tersimpan." : "Terima kasih, data profil Anda telah tersimpan."}
            </p>
            <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-6 flex items-center justify-center gap-1.5">
              <CheckCircle2 size={14} /> {isEditing ? "Update" : "Capture"} Success
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate("/mahasiswa")}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
              >
                Kembali ke Mahasiswa
              </button>
              <button
                onClick={() => navigate("/")}
                className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                Ke Beranda
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadingExisting) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-4 max-w-2xl">
          <Breadcrumb
            items={[
              { label: "Beranda", href: "/" },
              { label: isEditing ? "Edit" : "Capture", href: "/capture" },
              { label: "Memuat...", status: "active" },
            ]}
            className="mb-4"
          />
        </div>
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  const breadcrumbItems = error
    ? buildCaptureBreadcrumb(step, isEditing, { status: "error", message: error })
    : buildCaptureBreadcrumb(step, isEditing);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-2 max-w-2xl">
          <Breadcrumb items={breadcrumbItems} />
        </div>
      </div>
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => (step === 1 ? navigate("/") : setStep(step - 1))}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 text-sm">
            {[
              { num: 1, label: isEditing ? "Foto *" : "Foto" },
              { num: 2, label: "Profil" },
              { num: 3, label: "Kirim" },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                    step > s.num
                      ? "bg-green-500 text-white"
                      : step === s.num
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step > s.num ? "✓" : s.num}
                </div>
                <span
                  className={`hidden sm:inline ${
                    step === s.num ? "text-blue-600 font-medium" : "text-gray-500"
                  }`}
                >
                  {s.label}
                </span>
                {s.num < 3 && <div className="w-6 h-px bg-gray-300 hidden sm:block" />}
              </div>
            ))}
          </div>
          {isEditing && (
            <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
              Mode Edit
            </span>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <PhotoUpload onCaptured={handlePhotoCaptured} />
        )}

        {step === 2 && (
          <StudentForm
            initialNrp={initialNrp}
            initialForm={isEditing ? form : undefined}
            onResolved={handleStudentResolved}
            onFormChange={handleFormChange}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Ringkasan Data</h2>
            <ImageLightbox
              src={photo ? photo.dataUrl : existingPhotoUrl}
              alt="Preview Foto"
              open={previewLightbox}
              onClose={() => setPreviewLightbox(false)}
              fileName={`${student?.nrp || "foto"}-${student?.name?.replace(/\s+/g, "_") || "preview"}.jpg`}
            />
            <div className="space-y-3 mb-6">
              {(photo || existingPhotoUrl) && (
                <div>
                  <p className="text-sm text-gray-500">
                    Foto {isEditing && !photo && "(sebelumnya)"}
                  </p>
                  <button
                    onClick={() => setPreviewLightbox(true)}
                    className="block w-full relative group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg overflow-hidden mt-1 border"
                    aria-label="Lihat foto fullscreen"
                  >
                    <img
                      src={photo ? photo.dataUrl : existingPhotoUrl}
                      alt="Preview"
                      className="w-full max-h-60 object-contain group-hover:brightness-95 transition"
                    />
                    <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-end justify-center pb-2">
                      <span className="bg-black/70 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                        <Maximize2 size={12} /> Tap untuk lihat full
                      </span>
                    </span>
                  </button>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {photo
                        ? `${photo.geotag.latitude.toFixed(6)}, ${photo.geotag.longitude.toFixed(6)}`
                        : `${existingLat.toFixed(6)}, ${existingLng.toFixed(6)}`}
                    </div>
                    <button
                      onClick={async () => {
                        const src = photo ? photo.dataUrl : existingPhotoUrl;
                        if (!src) return;
                        setDownloadingPreview(true);
                        await downloadImage(src, `${student?.nrp || "foto"}-${student?.name?.replace(/\s+/g, "_") || "preview"}.jpg`);
                        setDownloadingPreview(false);
                      }}
                      disabled={downloadingPreview}
                      className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-full flex items-center gap-1 disabled:opacity-50"
                    >
                      {downloadingPreview ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      Download
                    </button>
                  </div>
                </div>
              )}
              {student && (
                <>
                  <div>
                    <p className="text-sm text-gray-500">NRP</p>
                    <p className="font-medium">{student.nrp}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nama</p>
                    <p className="font-medium">{student.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Prodi</p>
                    <p className="font-medium">{student.major}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Asal Daerah</p>
                    <p className="font-medium">{form.asalDaerah}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Hobi</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {form.hobi.map((h) => (
                        <span key={h} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{h}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">First Impression</p>
                    <p className="text-sm">{form.firstImpression}</p>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Kirim Data"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
