"use client";

import Link from "next/link";
import {
  Lock,
  X,
} from "lucide-react";

type BannerProps = {
  toolName: string;
};

type ModalProps = {
  open: boolean;
  toolName: string;
  onClose: () => void;
};

export function ProfessionalAgentToolBanner({
  toolName,
}: BannerProps) {
  return (
    <div className="mb-5 rounded-2xl border border-[#D8C9A9] bg-[#FBF8F1] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#B58A3C]/10 text-[#9E762F]">
          <Lock className="h-5 w-5" />
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9E762F]">
            Fitur Gold & Agent Pro / Gold & Agent Pro Feature
          </p>

          <p className="mt-1 text-sm font-bold text-[#1C1C1E]">
            Jelajahi {toolName} / Explore {toolName}
          </p>

          <p className="mt-1 text-xs leading-5 text-gray-600 sm:text-sm">
            Anda dapat menjelajahi fitur Agent Profesional ini sebelum
            melakukan upgrade. Untuk membuat, menyimpan, melihat preview penuh,
            atau menghasilkan dokumen profesional, diperlukan membership Gold
            atau Agent Pro.
            <span className="mt-2 block text-gray-500">
              You can explore this Professional Agent Tool before upgrading.
              Creating, saving, previewing or generating professional outputs
              requires a Gold or Agent Pro membership.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function ProfessionalAgentToolUpgradeModal({
  open,
  toolName,
  onClose,
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Membership Gold atau Agent Pro diperlukan / Gold or Agent Pro membership required"
    >
      <div className="relative w-full max-w-md rounded-[2rem] border border-white/20 bg-white p-6 shadow-2xl sm:p-7">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-black"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B58A3C]/10 text-[#9E762F]">
          <Lock className="h-5 w-5" />
        </div>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.15em] text-[#9E762F]">
          Fitur Gold & Agent Pro / Gold & Agent Pro Feature
        </p>

        <h2 className="mt-2 pr-8 text-xl font-black text-[#1C1C1E]">
          Siap menggunakan {toolName}?
          <span className="mt-1 block text-base font-bold text-gray-500">
            Ready to use {toolName}?
          </span>
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Fitur Agent Profesional ini dapat dijelajahi oleh semua agen
          Tetamo. Untuk membuat, menyimpan, melihat preview penuh, atau
          menghasilkan dokumen profesional, silakan upgrade ke Gold atau
          Agent Pro.
          <span className="mt-2 block text-gray-500">
            This Professional Agent Tool is available to explore for all Tetamo
            agents. To create, save, preview or generate professional outputs,
            upgrade to Gold or Agent Pro.
          </span>
        </p>

        <div className="mt-6 space-y-3">
          <Link
            href="/agentdashboard/paket"
            className="flex w-full items-center justify-center rounded-xl bg-[#B58A3C] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#9E762F]"
          >
            Lihat Paket Gold & Agent Pro / View Gold & Agent Pro
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-bold text-[#1C1C1E] transition hover:bg-gray-50"
          >
            Lanjut Jelajahi / Continue Exploring
          </button>
        </div>
      </div>
    </div>
  );
}
