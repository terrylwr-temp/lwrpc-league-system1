"use client";

import { useState } from "react";
import { AskLwrAssistantDrawer } from "./AskLwrAssistant";

export function AskLwrSparkleIcon({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 2 .9 4.1L17 7l-4.1.9L12 12l-.9-4.1L7 7l4.1-.9L12 2Z"/><path d="m19 14 .5 2.5L22 17l-2.5.5L19 20l-.5-2.5L16 17l2.5-.5L19 14Z"/><path d="m5 14 .6 2.4L8 17l-2.4.6L5 20l-.6-2.4L2 17l2.4-.6L5 14Z"/></svg>;
}

// The sole authenticated entry point for the shared player-facing assistant.
// AskLwrAssistant derives pathname/module context from the current route itself.
export default function AskLwrTrigger({ role = "player", compact = false }) {
  const [open, setOpen] = useState(false);
  const dimensions = compact ? "h-[30px] w-[30px]" : "h-[42px] w-[42px]";
  const iconSize = compact ? 18 : 20;

  return <>
    <button type="button" onClick={() => setOpen(true)} className={`grid ${dimensions} shrink-0 place-items-center rounded-full border border-[#dce4ef] bg-white p-0 text-[#536079] transition hover:-translate-y-px hover:border-[#99b7ed] hover:text-[#1558d5] focus:outline-none focus:ring-2 focus:ring-[#1558d5] focus:ring-offset-2`} aria-label="Ask LWR Pickleball Club AI" title="Ask LWR Pickleball Club AI"><AskLwrSparkleIcon size={iconSize}/></button>
    <AskLwrAssistantDrawer open={open} onClose={() => setOpen(false)} role={role}/>
  </>;
}
