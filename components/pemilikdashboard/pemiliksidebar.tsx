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
    "block px-3 py-3 rounded-xl transition",
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
    <div className="min-h-screen bg-[#F7F7F7] p-10">
      <div className="flex">
        {/* LEFT SIDEBAR */}
        <aside
          className="
            w-72
            bg-[#1C1C1E]
            text-white
            min-h-screen
            px-10 py-10
            flex flex-col
            rounded-3xl
            shadow-[0_20px_60px_rgba(0,0,0,0.35)]
            ring-1 ring-white/10
          "
        >
          {/* Profile Section */}
          <div>
            <div className="flex flex-col">
              <div className="w-36 h-36 rounded-xl overflow-hidden bg-white/10 border border-white/10 mb-6">
                <img
                  src={owner.photo}
                  alt={owner.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <p className="font-bold text-2xl mt-1 tracking-tight">
                  {owner.name}
                </p>
                <p className="font-bold text-1xl mt-1 tracking-tight">
                  {owner.agency}
                </p>
                <p className="text-s font-medium mt-1">{owner.number}</p>
              </div>
            </div>

            {/* Social Media */}
<div className="mt-4 flex gap-2">
  <a
    href="https://www.instagram.com/tetamoid/"
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
  >
    Instagram
  </a>

  <a
    href="https://facebook.com/tetamoindonesia"
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
  >
    Facebook
  </a>

  <a
    href="https://tiktok.com/@tetamo.com"
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
  >
    TikTok
  </a>
</div>
</div>

{/* Divider */}
<div className="border-t border-white/10 my-8" />

          {/* Menu Section */}
          <nav className="space-y-3 text-base">
  <Link href="/pemilikdashboard" className={menuItemClass("/pemilikdashboard")}>
    Ringkasan
  </Link>

  <Link href="/pemilikdashboard/leads" className={menuItemClass("/pemilikdashboard/leads")}>
    Leads
  </Link>

  <Link href="/pemilikdashboard/tagihan" className={menuItemClass("/pemilikdashboard/tagihan")}>
    Tagihan
  </Link>

  <Link href="/pemilikdashboard/pengaturan" className={menuItemClass("/pemilikdashboard/pengaturan")}>
    Pengaturan
  </Link>
</nav>
        </aside>

        {/* RIGHT CONTENT */}
        <main className="flex-1 px-10 py-10">{children}</main>
      </div>
    </div>
  );
}