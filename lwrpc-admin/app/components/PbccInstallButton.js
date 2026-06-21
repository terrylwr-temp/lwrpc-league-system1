"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const PBCC_INSTALL_ICON = "/pbcc-pickleball-icon-192.png?v=pbcc-pickleball-20260621";

function deviceInstallSteps() {
  if (typeof navigator === "undefined") return "Use your browser menu and choose Add to Home Screen or Install App.";

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const isAppleMobile = /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);
  const isEdge = /Edg/i.test(userAgent);

  if (isAppleMobile) {
    return isEdge
      ? "On iPad or iPhone, open this page in Safari, tap Share, then Add to Home Screen."
      : "Tap Share, then Add to Home Screen.";
  }

  if (isAndroid) {
    return isEdge
      ? "Tap the Edge menu, then look for Add to phone, Add to Home screen, Apps, or Install app. If it is missing, open this page in Chrome and use Add to Home screen."
      : "Open the browser menu, then choose Add to Home screen or Install app.";
  }

  return "Use Chrome or Edge, then choose the install icon in the address bar or open the browser menu and choose Apps or Install this site as an app.";
}

export default function PbccInstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showMobileInstall, setShowMobileInstall] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const mobileInstallQuery = window.matchMedia("(pointer: coarse), (max-width: 1023px)");
    function updateMobileInstallVisibility() {
      setShowMobileInstall(mobileInstallQuery.matches);
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    }

    updateMobileInstallVisibility();
    if (mobileInstallQuery.addEventListener) {
      mobileInstallQuery.addEventListener("change", updateMobileInstallVisibility);
    } else {
      mobileInstallQuery.addListener(updateMobileInstallVisibility);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      if (mobileInstallQuery.removeEventListener) {
        mobileInstallQuery.removeEventListener("change", updateMobileInstallVisibility);
      } else {
        mobileInstallQuery.removeListener(updateMobileInstallVisibility);
      }
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }

    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  }

  if (!showMobileInstall) return null;

  return (
    <>
      <button
        type="button"
        onClick={installApp}
        className="mt-3 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-teal-700 bg-teal-50 px-4 py-3 text-sm font-black text-teal-950 shadow-[0_12px_26px_-18px_rgba(15,118,110,0.95)] transition hover:-translate-y-0.5 hover:bg-teal-100 hover:shadow-md"
      >
        <Image src={PBCC_INSTALL_ICON} alt="" width={32} height={32} className="h-8 w-8 rounded-lg bg-white object-contain shadow-sm" />
        <span>{installed ? "PBCourtCommand Installed" : "Install PBCourtCommand"}</span>
      </button>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)]">
            <div className="bg-[linear-gradient(135deg,#0f766e,#2563eb)] p-4 text-white">
              <div className="text-xs font-black uppercase tracking-wide text-cyan-100">Add App Icon</div>
              <h2 className="mt-1 text-xl font-black">PBCourtCommand</h2>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 rounded-lg border border-teal-100 bg-teal-50 p-3">
                <Image src={PBCC_INSTALL_ICON} alt="" width={48} height={48} className="h-12 w-12 rounded-xl bg-white object-contain shadow-sm" />
                <p className="text-sm font-bold leading-relaxed text-teal-950">{deviceInstallSteps()}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="mt-4 w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm hover:border-slate-500 hover:bg-slate-50"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
