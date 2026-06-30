import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
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

export default function Capture() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialNrp = searchParams.get("nrp") || "";
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState<OverlayResult | null>(null);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [form, setForm] = useState<FormData>({
    asalDaerah: "",
    hobi: [],
    firstImpression: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
    if (!photo || !student) return;
    setSubmitting(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

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
      const photoUrl = uploadBody.data.photo_url;

      const payload = {
        nrp: student.nrp,
        asal_daerah: form.asalDaerah,
        hobi: form.hobi,
        first_impression: form.firstImpression,
        longitude: photo.geotag.longitude,
        latitude: photo.geotag.latitude,
        captured_at: photo.geotag.timestamp,
        photo_url: photoUrl,
      };

      const submitRes = await fetch(apiUrl("/students/submissions"), {
        method: "POST",
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
            <Send size={28} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Data Berhasil Dikirim!</h2>
          <p className="text-gray-600 mb-6">
            Terima kasih, data profil Anda telah tersimpan.
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Kembali ke Beranda
          </button>
        </div>
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
              { num: 1, label: "Foto" },
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
            onResolved={handleStudentResolved}
            onFormChange={handleFormChange}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Ringkasan Data</h2>
            <div className="space-y-3 mb-6">
              {photo && (
                <div>
                  <p className="text-sm text-gray-500">Foto</p>
                  <img
                    src={photo.dataUrl}
                    alt="Preview"
                    className="w-full max-h-60 object-contain rounded-lg mt-1 border"
                  />
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {photo.geotag.latitude.toFixed(6)}, {photo.geotag.longitude.toFixed(6)}
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
              {submitting ? "Mengirim..." : "Kirim Data"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
