"use client";

import { useEffect, useState } from "react";

/** Смуга прогресу з анімацією заповнення при завантаженні. */
export function ProgressBar({
  pct,
  color = "#FA321E",
}: {
  pct: number;
  color?: string;
}) {
  const target = Math.max(0, Math.min(100, pct));
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(target), 60);
    return () => clearTimeout(t);
  }, [target]);
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${w}%`, backgroundColor: color }}
      />
    </div>
  );
}
