export default function ListingCount({ label, shown, total, className = "", compact = false }) {
  return (
    <div className={`${compact ? "inline-flex items-baseline gap-2 rounded-lg px-2.5 py-1.5" : "min-w-[7rem] rounded-xl px-4 py-3 text-right"} bg-slate-900 text-white ${className}`.trim()}>
      <div className={`${compact ? "text-[9px]" : "text-[10px]"} font-bold uppercase tracking-wide text-slate-300`}>
        {label}
      </div>
      <div className={`${compact ? "text-sm" : "mt-1 text-2xl"} whitespace-nowrap font-black leading-none`}>
        {shown} of {total}
      </div>
    </div>
  );
}
