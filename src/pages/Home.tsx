import { Camera, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import BackgroundBubbles from "../components/BackgroundBubbles";
import Breadcrumb from "../components/Breadcrumb";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const goCapture = () => {
    if (!isAuthenticated) {
      navigate("/auth?redirect=%2Fcapture&reason=unauthorized");
      return;
    }
    navigate("/capture");
  };
  const goMahasiswa = () => {
    if (!isAuthenticated) {
      navigate("/auth?redirect=%2Fmahasiswa&reason=unauthorized");
      return;
    }
    navigate("/mahasiswa");
  };

  return (
    <>
      <div className="relative h-screen">
        <Navbar />
        <BackgroundBubbles />
        <div className="absolute top-16 left-0 right-0 container mx-auto px-4 z-20 max-w-6xl">
          <Breadcrumb items={[{ label: "Beranda", status: "active" }]} />
        </div>
        <main className="absolute inset-0 flex flex-col items-center justify-center container mx-auto p-4">
          <div className="text-white p-2 rounded-lg mb-4">
            <span className="font-bold text-accent px-4 py-2 rounded-lg m-2 shadow-md">
              Created By RyZ
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-center font-bold mb-4 px-4">
            Kumpulkan Profil Mahasiswa, <br className="hidden sm:inline" />
            dalam satu tempat
          </h1>
          <p className="text-gray-700 text-center px-4 text-sm sm:text-base">
            Solusi terintegrasi untuk mengelola profil mahasiswa secara{" "}
            <br className="hidden sm:inline" />
            efisien dengan memanfaatkan sistem database
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={goCapture}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center gap-2"
            >
              <Camera size={20} />
              Mulai Capture
            </button>
            <button
              onClick={goMahasiswa}
              className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition duration-300 flex items-center gap-2"
            >
              <BarChart3 size={20} />
              Lihat Dashboard
            </button>
          </div>
          {!isAuthenticated && (
            <p className="mt-4 text-xs text-gray-500 text-center">
              Login Required to access Capture and Dashboard features.
            </p>
          )}
        </main>
      </div>
    </>
  );
}
