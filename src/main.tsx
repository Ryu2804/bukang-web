import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Camera, BarChart3 } from "lucide-react";
import "./index.css";
import Navbar from "./components/Navbar";
// import App from './App.tsx'

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="relative h-screen">
      <Navbar />
      <main className="absolute inset-0 flex flex-col items-center justify-center container mx-auto p-4">
        <div className="text-white p-2 rounded-lg mb-4">
          <span className="font-bold text-accent px-4 py-2 rounded-lg m-2 shadow-md">
            Created By RyZ
          </span>
        </div>
        <h1 className="text-6xl text-center font-bold mb-4">
          Kumpulkan Profil Mahasiswa, <br></br>dalam satu tempat
        </h1>
        <p className="text-gray-700 text-center">
          Solusi terintegrasi untuk mengelola profil mahasiswa secara <br />
          efisien dengan memanfaatkan sistem database
        </p>
        <div className="mt-8 flex space-x-4">
          <button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center gap-2">
            <Camera size={20} />
            Mulai Capture
          </button>
          <button className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition duration-300 flex items-center gap-2">
            <BarChart3 size={20} />
            Lihat Dashboard
          </button>
        </div>
      </main>
    </div>
  </StrictMode>,
);
