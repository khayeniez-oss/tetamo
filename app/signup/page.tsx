import { Suspense } from "react";
import SignupPageClient from "./client";

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-md rounded-[28px] border border-[#e5e5e7] bg-white p-5 text-sm text-[#6e6e73] shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:rounded-[32px] sm:p-8">
        Loading signup...
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignupPageClient />
    </Suspense>
  );
}