import { useState } from "react";
import { Camera, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import LoginModal from "../components/Login";
import BackgroundBubbles from "../components/BackgroundBubbles";

export default function Home() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <div className="relative h-screen">
        <Navbar onLoginClick={() => setIsLoginOpen(true)} />
        <BackgroundBubbles />
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
              onClick={() => navigate("/capture")}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center gap-2"
            >
              <Camera size={20} />
              Mulai Capture
            </button>
            <button
              onClick={() => navigate("/mahasiswa")}
              className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition duration-300 flex items-center gap-2"
            >
              <BarChart3 size={20} />
              Lihat Dashboard
            </button>
          </div>
        </main>
      </div>
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}
