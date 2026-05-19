"use client";

export default function LoadingScreen({
  title = "LWR PC League Management System",
  subtitle = "Loading..."
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-2xl">

        <img
          src="https://lwrpickleballclub.com/lwrpc-logo.png"
          alt="Lakewood Ranch Pickleball Club"
          className="mx-auto h-28 w-28 rounded-full bg-white object-contain"
        />

        <h1 className="mt-6 text-3xl font-black text-slate-900">
          {title}
        </h1>

        <p className="mt-2 text-sm font-medium text-slate-500">
          {subtitle}
        </p>

        <div className="mt-8 flex justify-center">
<div className="mt-8 flex justify-center">
  <img
    src="/favicon.ico"
    alt="Loading"
    className="h-16 w-16 animate-spin object-contain"
  />
</div>
        </div>

        <div className="mt-6 text-xs uppercase tracking-[0.2em] text-slate-400">
          Lakewood Ranch Pickleball Club
        </div>

      </div>
    </main>
  );
}