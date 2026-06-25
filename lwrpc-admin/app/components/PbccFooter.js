"use client";

import { APP_VERSION, COPYRIGHT_YEAR } from "../lib/version";
import { DEFAULT_SYSTEM_SETTINGS } from "../lib/systemSettings";

export default function PbccFooter({ clubName = "" }) {
  const displayClubName = clubName || DEFAULT_SYSTEM_SETTINGS.club_name;

  return (
    <footer className="mt-auto px-4 pb-2 pt-5 text-center text-xs font-semibold leading-relaxed text-slate-500 print:hidden">
      <div>{"\u00A9"} {COPYRIGHT_YEAR} {displayClubName}</div>
      <div>Version {APP_VERSION}</div>
    </footer>
  );
}
