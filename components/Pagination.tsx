"use client";
export function paginationPages(current: number, total: number): number[] {
  const start = Math.max(1, Math.min(current - 1, total - 2));
  return Array.from({ length: Math.min(3, total) }, (_, index) => start + index);
}
export default function Pagination({ page, totalPages, onChange, lang }: { page: number; totalPages: number; onChange: (page: number) => void; lang: string }) {
  if (totalPages <= 1) return null;
  const base = "inline-flex h-10 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-35";
  return <nav aria-label={lang === "id" ? "Navigasi halaman" : "Pagination"} className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
    <button type="button" className={`${base} border-[#E5DFD3] bg-white hover:bg-[#F7F4ED]`} disabled={page <= 1} onClick={() => onChange(page - 1)}>{lang === "id" ? "Sebelumnya" : "Previous"}</button>
    {paginationPages(page, totalPages).map(number => <button type="button" key={number} aria-label={`${lang === "id" ? "Halaman" : "Page"} ${number}`} aria-current={number === page ? "page" : undefined} onClick={() => onChange(number)} className={`${base} min-w-10 ${number === page ? "border-[#1C1C1E] bg-[#1C1C1E] text-white" : "border-[#E5DFD3] bg-white hover:bg-[#F7F4ED]"}`}>{number}</button>)}
    <button type="button" className={`${base} border-[#E5DFD3] bg-white hover:bg-[#F7F4ED]`} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>{lang === "id" ? "Berikutnya" : "Next"}</button>
  </nav>;
}
