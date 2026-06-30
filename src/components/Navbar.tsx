import { useNavigate, useLocation } from "react-router-dom";
import { Camera, Grid3X3 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ onLoginClick }: { onLoginClick: () => void }) {
  const { isAuthenticated, username, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bg-white-800 px-4 py-3 relative z-10">
      <div className="container mx-auto flex items-center justify-between">
        <div
          className="text-base sm:text-lg font-semibold cursor-pointer"
          onClick={() => navigate("/")}
        >
          Bukang Web
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <button
            onClick={() => navigate("/capture")}
            className={`text-sm flex items-center gap-1 ${
              location.pathname === "/capture"
                ? "text-blue-600 font-medium"
                : "text-gray-700 hover:text-gray-900"
            }`}
          >
            <Camera size={16} />
            Capture
          </button>
          <button
            onClick={() => navigate("/mahasiswa")}
            className={`text-sm flex items-center gap-1 ${
              location.pathname === "/mahasiswa"
                ? "text-blue-600 font-medium"
                : "text-gray-700 hover:text-gray-900"
            }`}
          >
            <Grid3X3 size={16} />
            Mahasiswa
          </button>
        </div>
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{username}</span>
            <button
              className="bg-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded hover:bg-gray-300"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            className="bg-blue-500 text-white text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2 rounded hover:bg-blue-600"
            onClick={onLoginClick}
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
}
