import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Home from "../pages/Home";
import Capture from "../pages/Capture";
import Mahasiswa from "../pages/Mahasiswa";
import Auth from "../pages/Auth";
import ProtectedRoute from "../components/ProtectedRoute";
import { AuthProvider } from "../context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/capture"
            element={
              <ProtectedRoute>
                <Capture />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mahasiswa"
            element={
              <ProtectedRoute>
                <Mahasiswa />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
