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
          {/* фірмовий червоний акцент */}
          <div className="h-1 w-full bg-brand" />
          <header className="border-b border-[#26262a] bg-[#0d0d0f]/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
              <Link href="/" className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Elit-Web" className="h-8 w-auto" />
                <span className="hidden text-sm text-neutral-500 sm:inline">Маркетинг-дешборд</span>
              </Link>
              <nav className="flex flex-wrap gap-1">
                {nav.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="rounded-lg px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
          <footer className="mx-auto max-w-7xl px-6 py-8 text-xs text-neutral-600">
            Дані: Windsor.ai · Оновлення дешборду кожні 10 хв · © Elit-Web
          </footer>
        </div>
      </body>
    </html>
  );
}
