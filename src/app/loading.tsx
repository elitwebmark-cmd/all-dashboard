import { Spinner } from "@/components/Spinner";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
        <Spinner className="text-brand" />
        <span>Оновлення даних…</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-[84px] animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card h-[84px] animate-pulse" />
        ))}
      </div>
      <div className="card h-80 animate-pulse" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card h-64 animate-pulse" />
        <div className="card h-64 animate-pulse" />
      </div>
    </div>
  );
}
