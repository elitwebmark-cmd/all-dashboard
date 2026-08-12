import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elit-Web · Marketing Dashboard",
  description: "Онлайн-дешборд маркетингових показників Elit-Web (Windsor.ai)",
};

const nav = [
  { href: "/", label: "Огляд" },
  { href: "/channels/google_ads", label: "Google Ads" },
  { href: "/channels/meta", label: "Meta Ads" },
  { href: "/channels/ga4", label: "GA4" },
  { href: "/channels/search_console", label: "Search Console" },
  { href: "/channels/hubspot", label: "HubSpot" },
  { href: "/compare", label: "Порівняння" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-lg font-bold text-brand">Elit-Web</span>
                <span className="text-sm text-slate-400">Marketing Dashboard</span>
              </Link>
              <nav className="flex gap-1">
                {nav.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="rounded-lg px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
          <footer className="mx-auto max-w-7xl px-6 py-8 text-xs text-slate-600">
            Дані: Windsor.ai · Оновлення дешборду кожні 10 хв · © Elit-Web
          </footer>
        </div>
      </body>
    </html>
  );
}
