import { useState, useEffect } from "react";
import { Download, X, Smartphone, Share } from "lucide-react";
import { initInstallPrompt, getDeferredPrompt, clearDeferredPrompt, isStandalone, type BeforeInstallPromptEvent } from "../pwa";

export default function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  useEffect(() => {
    setIsStandaloneMode(isStandalone());
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIOS(ios);

    // Jika sudah pernah dismiss, jangan tampilkan lagi selama session? Simpan di localStorage
    if (localStorage.getItem("pwa-dismissed") === "1") {
      setDismissed(true);
    }

    initInstallPrompt(
      (e) => {
        if (localStorage.getItem("pwa-dismissed") !== "1") setPromptEvent(e);
      },
      () => {
        setPromptEvent(null);
        setDismissed(true);
      },
    );

    // Untuk iOS yang tidak support beforeinstallprompt, tampilkan manual jika belum standalone
    if (ios && !isStandalone()) {
      // tidak ada event, tapi tetap tampilkan hint setelah 3 detik
      const t = setTimeout(() => {
        if (!localStorage.getItem("pwa-dismissed")) setPromptEvent({} as any); // dummy untuk iOS
      }, 3000);
      return () => clearTimeout(t);
    }
  }, []);

  if (dismissed || isStandaloneMode) return null;
  // Jika bukan iOS dan tidak ada prompt, jangan tampilkan
  if (!promptEvent && !isIOS) return null;
  // Jika sudah standalone, jangan tampilkan
  if (isStandalone()) return null;

  const handleInstall = async () => {
    const e = getDeferredPrompt();
    if (e && e.prompt) {
      await e.prompt();
      const choice = await e.userChoice;
      if (choice.outcome === "accepted") {
        clearDeferredPrompt();
        setPromptEvent(null);
      }
      // Jika iOS dummy, tidak ada prompt
    } else if (isIOS) {
      // iOS: tidak bisa programmatic install, hanya instruksi
    }
    setDismissed(true);
    localStorage.setItem("pwa-dismissed", "1");
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-dismissed", "1");
    clearDeferredPrompt();
    setPromptEvent(null);
  };

  // iOS hint
  if (isIOS && (!promptEvent || !(promptEvent as any).prompt)) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-40 bg-white border shadow-xl rounded-2xl p-4 flex gap-3 items-start sm:max-w-md sm:left-auto sm:right-4">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <Smartphone size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Install Bukang di HP</p>
          <p className="text-xs text-gray-600 mt-1">
            Tap <span className="inline-flex items-center gap-1 font-medium"><Share size={12} /> Share</span> lalu <span className="font-medium">Add to Home Screen</span> untuk pakai offline.
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleDismiss} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-xs font-medium">
              Nanti
            </button>
            <button onClick={handleDismiss} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-medium">
              Mengerti
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="shrink-0 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-2xl shadow-xl p-4 flex gap-3 items-start sm:max-w-md sm:left-auto sm:right-4">
      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0 backdrop-blur">
        <Download size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Download Bukang ke HP</p>
        <p className="text-xs text-white/80 mt-1">Install agar bisa dibuka offline & langsung dari Home Screen.</p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleDismiss}
            className="flex-1 bg-white/15 hover:bg-white/25 text-white py-2 rounded-xl text-xs font-medium backdrop-blur border border-white/20"
          >
            Nanti
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 bg-white text-blue-600 py-2 rounded-xl text-xs font-semibold hover:bg-gray-100"
          >
            Install
          </button>
        </div>
      </div>
      <button onClick={handleDismiss} className="shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
        <X size={14} />
      </button>
    </div>
  );
}
