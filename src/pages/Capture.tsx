import { useState, useEffect } from "react";
import { ArrowLeft, Send, Pencil } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PhotoUpload from "../components/Capture/PhotoUpload";
import StudentForm from "../components/Capture/StudentForm";
import type { OverlayResult } from "../services/overlay";
import { apiUrl } from "../services/api";

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
  const [searchParams] = useSearchParams();
  const initialNrp = searchParams.get("nrp") || "";
  const submissionId = searchParams.get("submission_id") || "";
  const isEditing = !!submissionId;

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

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      try {
        const token = localStorage.getItem("access_token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(apiUrl(`/students/submissions/${submissionId}`), { headers });
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

  const handlePhotoCaptured = (data: OverlayResult) => {
    setPhoto(data);
    setStep(2);
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
      const token = localStorage.getItem("access_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let photoUrl = existingPhotoUrl;
      let longitude = existingLng;
      let latitude = existingLat;
      let capturedAt = existingCapturedAt;

      if (photo) {
        const formData = new FormData();
        formData.append("file", photo.file);

        const uploadRes = await fetch(apiUrl("/students/upload-photo"), {
          method: "POST",
          headers,
          body: formData,
        });
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
        asal_daerah: form.asalDaerah,
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

      const submitRes = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      });
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {isEditing ? <Pencil size={28} className="text-green-600" /> : <Send size={28} className="text-green-600" />}
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {isEditing ? "Data Berhasil Diperbarui!" : "Data Berhasil Dikirim!"}
          </h2>
          <p className="text-gray-600 mb-6">
            {isEditing ? "Perubahan data profil telah tersimpan." : "Terima kasih, data profil Anda telah tersimpan."}
          </p>
          <button
            onClick={() => navigate("/mahasiswa")}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Kembali ke Mahasiswa
          </button>
        </div>
      </div>
    );
  }

  if (loadingExisting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            editMode={isEditing}
            onResolved={handleStudentResolved}
            onFormChange={handleFormChange}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Ringkasan Data</h2>
            <div className="space-y-3 mb-6">
              {(photo || existingPhotoUrl) && (
                <div>
                  <p className="text-sm text-gray-500">
                    Foto {isEditing && !photo && "(sebelumnya)"}
                  </p>
                  <img
                    src={photo ? photo.dataUrl : existingPhotoUrl}
                    alt="Preview"
                    className="w-full max-h-60 object-contain rounded-lg mt-1 border"
                  />
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {photo
                      ? `${photo.geotag.latitude.toFixed(6)}, ${photo.geotag.longitude.toFixed(6)}`
                      : `${existingLat.toFixed(6)}, ${existingLng.toFixed(6)}`}
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
