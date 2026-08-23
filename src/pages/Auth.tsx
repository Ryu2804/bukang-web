import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link, useLocation } from "react-router-dom";
import { Eye, EyeOff, Loader2, LogIn, UserPlus, ArrowLeft, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../services/api";
import Breadcrumb from "../components/Breadcrumb";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, register, isAuthenticated } = useAuth();

  const redirectParam = searchParams.get("redirect") || "/";
  // sanitize redirect: only allow internal paths
  const redirect = redirectParam.startsWith("/") ? redirectParam : "/";
  const reason = searchParams.get("reason") || "";
  const fromProtected = reason === "unauthorized" || !!searchParams.get("redirect");

  const [mode, setMode] = useState<"login" | "signup">(searchParams.get("mode") === "signup" ? "signup" : "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  // If already authenticated, go to redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [isAuthenticated, navigate, redirect]);

  // Keep mode in sync with query ?mode=signup
  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "signup" || m === "login") setMode(m);
  }, [searchParams]);

  const switchMode = () => {
    const next = isLogin ? "signup" : "login";
    setMode(next);
    setError("");
    // update url without reload
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("mode", next);
    navigate(`${location.pathname}?${nextParams.toString()}`, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Username dan password harus diisi");
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
        await login(username.trim(), password);
      }
      // success will trigger useEffect redirect
      navigate(redirect, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        // Beautify common errors
        const msg = err.message.toLowerCase().includes("already taken") || err.message.toLowerCase().includes("taken")
          ? "Username sudah dipakai, silakan login atau gunakan username lain"
          : err.message;
        setError(msg);
      } else {
        setError("Terjadi kesalahan, silakan coba lagi");
      }
    } finally {
      setLoading(false);
    }
  };

  const targetLabel = redirect.includes("capture")
    ? "Capture"
    : redirect.includes("mahasiswa")
      ? "Mahasiswa"
      : "halaman tersebut";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50 flex flex-col">
      {/* Top bar */}
      <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-6xl">
        <Link to="/" className="text-lg font-semibold hover:text-blue-600 flex items-center gap-2">
          <ArrowLeft size={18} />
          Bukang Web
        </Link>
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
          Kembali ke Home
        </Link>
      </div>
      <div className="container mx-auto px-4 max-w-6xl">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/" },
            { label: "Auth", href: "/auth" },
            error
              ? { label: isLogin ? "Login Gagal" : "Sign Up Gagal", status: "error" }
              : { label: isLogin ? "Login" : "Sign Up", status: "active" },
            ...(fromProtected ? [{ label: `→ ${targetLabel}`, status: "active" as const }] : []),
          ]}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {fromProtected && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3">
              <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Login diperlukan</p>
                <p className="text-xs text-amber-700 mt-1">
                  Silakan login untuk mengakses <span className="font-semibold">{targetLabel}</span>. Belum punya akun? Buat akun dulu, gratis.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl border p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                {isLogin ? <LogIn size={22} className="text-white" /> : <UserPlus size={22} className="text-white" />}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{isLogin ? "Login" : "Sign Up"}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {isLogin ? "Masuk untuk mengelola data mahasiswa" : "Buat akun untuk mulai capture"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="masukkan username"
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="masukkan password"
                    className="w-full px-3.5 py-2.5 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="ulangi password"
                      className="w-full px-3.5 py-2.5 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Memproses..." : isLogin ? "Login" : "Sign Up"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-6">
              {isLogin ? "Belum punya akun? " : "Sudah punya akun? "}
              <button onClick={switchMode} className="text-blue-600 hover:underline font-medium">
                {isLogin ? "Sign Up" : "Login"}
              </button>
            </p>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-xs text-gray-400">
                Setelah login kamu akan diarahkan ke <span className="font-medium text-gray-600">{redirect}</span>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} Buku Angkatan WebApp
          </p>
        </div>
      </div>
    </div>
  );
}
