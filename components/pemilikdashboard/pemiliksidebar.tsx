"use client";
// app/pemilikdashboard/layout.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PemilikDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const menuItemClass = (href: string) =>
    [
      "block rounded-xl px-3 py-3 text-sm sm:text-[15px] transition",
      pathname === href
        ? "bg-white/10 text-white font-semibold"
        : "text-white/85 hover:bg-white/10 hover:text-white",
    ].join(" ");

  const owner = {
    name: "Gunawan",
    agency: "Brighton Agency",
    number: "0812-3456-7890",
    photo:
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=300&q=80",
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] p-4 sm:p-6 lg:p-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        {/* LEFT SIDEBAR */}
        <aside
          className="
            w-full
            lg:w-72
            xl:w-80
            bg-[#1C1C1E]
            text-white
            lg:min-h-screen
            px-5 py-6
            sm:px-6 sm:py-7
            lg:px-8 lg:py-8
            flex flex-col
            rounded-3xl
            shadow-[0_20px_60px_rgba(0,0,0,0.35)]
            ring-1 ring-white/10
          "
        >
          {/* Profile Section */}
          <div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4 sm:gap-5 lg:gap-0">
              <div className="h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 xl:h-36 xl:w-36 overflow-hidden rounded-2xl bg-white/10 border border-white/10 shrink-0">
                <img
                  src={owner.photo}
                  alt={owner.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <p className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                  {owner.name}
                </p>
                <p className="mt-1 text-sm font-bold tracking-tight sm:text-base">
                  {owner.agency}
                </p>
                <p className="mt-1 text-sm font-medium text-white/80 break-words">
                  {owner.number}
                </p>
              </div>
            </div>

            {/* Social Media */}
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="https://www.instagram.com/tetamoid/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20 transition"
              >
                Instagram
              </a>

              <a
                href="https://facebook.com/tetamoindonesia"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20 transition"
              >
                Facebook
              </a>

              <a
                href="https://tiktok.com/@tetamo.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20 transition"
              >
                TikTok
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-white/10 sm:my-7 lg:my-8" />

          {/* Menu Section */}
          <nav className="space-y-2 sm:space-y-3">
            <Link
              href="/pemilikdashboard"
              className={menuItemClass("/pemilikdashboard")}
            >
              Ringkasan
            </Link>

            <Link
              href="/pemilikdashboard/leads"
              className={menuItemClass("/pemilikdashboard/leads")}
            >
              Leads
            </Link>

            <Link
              href="/pemilikdashboard/tagihan"
              className={menuItemClass("/pemilikdashboard/tagihan")}
            >
              Tagihan
            </Link>

            <Link
              href="/pemilikdashboard/pengaturan"
              className={menuItemClass("/pemilikdashboard/pengaturan")}
            >
              Pengaturan
            </Link>
          </nav>
        </aside>

        {/* RIGHT CONTENT */}
        <main className="min-w-0 flex-1 px-1 py-1 sm:px-2 sm:py-2 lg:px-6 lg:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}