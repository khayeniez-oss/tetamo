"use client";

import { useLanguage } from "@/app/context/LanguageContext";

export default function FloatingWhatsApp() {
  const { lang } = useLanguage();

  const phone = "6282313556606";

  const message =
    lang === "id"
      ? "Hi Tetamo, saya tertarik untuk memasang properti saya di platform Tetamo. Saya adalah pemilik/agen. Bagaimana prosesnya?"
      : "Hi Tetamo, I’m interested in listing my property on the Tetamo platform. I am an owner/agent. How can I proceed?";

  const text = encodeURIComponent(message);
  const href = `https://wa.me/${phone}?text=${text}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      title="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-[#B8860B]/30 bg-[#1C1C1E] text-white shadow-[0_12px_30px_rgba(184,134,11,0.28)] transition hover:scale-105 hover:opacity-95"
    >
      <svg
        viewBox="0 0 32 32"
        className="h-7 w-7 fill-current"
        aria-hidden="true"
      >
        <path d="M19.11 17.21c-.26-.13-1.52-.75-1.75-.83-.23-.09-.39-.13-.56.13-.17.26-.65.83-.8 1-.15.17-.3.2-.56.07-.26-.13-1.1-.4-2.1-1.28-.77-.69-1.3-1.54-1.45-1.8-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.07-.13-.56-1.35-.77-1.85-.2-.48-.41-.41-.56-.42h-.48c-.17 0-.45.07-.69.32-.23.26-.89.87-.89 2.11 0 1.24.91 2.44 1.04 2.61.13.17 1.79 2.73 4.34 3.82.61.26 1.09.42 1.46.54.61.19 1.17.16 1.61.1.49-.07 1.52-.62 1.73-1.22.22-.6.22-1.11.15-1.22-.06-.11-.23-.17-.49-.3Z" />
        <path d="M16.03 3.2c-7.07 0-12.8 5.73-12.8 12.8 0 2.26.59 4.46 1.72 6.41L3.2 28.8l6.56-1.72a12.76 12.76 0 0 0 6.27 1.6h.01c7.07 0 12.8-5.73 12.8-12.8 0-3.43-1.33-6.65-3.76-9.08A12.69 12.69 0 0 0 16.03 3.2Zm0 23.34h-.01a10.6 10.6 0 0 1-5.39-1.48l-.39-.23-3.89 1.02 1.04-3.79-.25-.39a10.63 10.63 0 1 1 8.89 4.87Z" />
      </svg>
    </a>
  );
}