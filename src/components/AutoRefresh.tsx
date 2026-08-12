"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Оновлює дані дешборду кожні N мс без перезавантаження всієї сторінки. */
export function AutoRefresh({ intervalMs = 600_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);
  return null;
}
