"use client";

import { APP_VERSION, COPYRIGHT_YEAR } from "../lib/version";
import { DEFAULT_SYSTEM_SETTINGS } from "../lib/systemSettings";

export default function PbccFooter({ clubName = "" }) {
  const displayClubName = clubName || DEFAULT_SYSTEM_SETTINGS.club_name;
  const footerText = `\u00A9 ${COPYRIGHT_YEAR} ${displayClubName} · Version ${APP_VERSION}`;

  return (
    <>
      <div aria-hidden="true" className="h-8 shrink-0 print:hidden" />
      <footer className="fixed inset-x-0 bottom-0 z-40 flex h-8 items-center justify-center border-t border-slate-200/80 bg-white/95 px-3 text-center text-[10px] font-semibold text-slate-500 shadow-[0_-4px_14px_-12px_rgba(15,23,42,0.55)] backdrop-blur print:hidden sm:text-xs">
        <div className="max-w-full truncate">{footerText}</div>
      </footer>
    </>
  );
}
