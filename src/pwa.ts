// PWA registration + install prompt handling
export function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Update found
          reg.addEventListener("updatefound", () => {
            const sw = reg.installing;
            if (sw) {
              sw.addEventListener("statechange", () => {
                if (sw.state === "installed" && navigator.serviceWorker.controller) {
                  // New content available, bisa tampilkan toast
                  console.log("[PWA] New content available, please refresh");
                  // Kirim message untuk skipWaiting
                  // reg.waiting?.postMessage({ type: "SKIP_WAITING" });
                }
              });
            }
          });
          console.log("[PWA] SW registered", reg.scope);
        })
        .catch((err) => console.warn("[PWA] SW register failed", err));
    });

    // Handle controller change (update)
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
}

// Untuk InstallPrompt component
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function initInstallPrompt(
  onAvailable: (e: BeforeInstallPromptEvent) => void,
  onInstalled: () => void,
) {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    onAvailable(deferredPrompt);
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    onInstalled();
    console.log("[PWA] App installed");
  });
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function clearDeferredPrompt() {
  deferredPrompt = null;
}

// Cek apakah sudah standalone (terinstall)
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}
