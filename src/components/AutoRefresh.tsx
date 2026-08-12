"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "./Spinner";

/** Оновлює дані дешборду кожні N мс + показує ненавʼязливий індикатор під час оновлення. */
export function AutoRefresh({ intervalMs = 600_000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const t = setInterval(() => startTransition(() => router.refresh()), intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);

  if (!pending) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 shadow-lg backdrop-blur">
      <Spinner className="text-brand" />
      Оновлення даних…
    </div>
  );
}
