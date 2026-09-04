"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import LoadingScreen from "../components/LoadingScreen";
import { AskLwrAssistantPage } from "../components/AskLwrAssistant";
import { requireRole } from "../lib/auth";

export default function AskLwrPage() {
  const router = useRouter();
  const [role, setRole] = useState("");
  useEffect(() => { (async () => { const user = await requireRole(router, "player"); if (user) setRole(user.role); })(); }, [router]);
  if (!role) return <LoadingScreen subtitle="Loading Ask LWR Pickleball Club AI..."/>;
  return <main className="min-h-screen bg-slate-100 p-4 md:p-6"><div className="mx-auto max-w-7xl"><AppHeader title="Ask LWR Pickleball Club AI" subtitle="Official LWR Pickleball Club information"/><AskLwrAssistantPage role={role}/></div></main>;
}
