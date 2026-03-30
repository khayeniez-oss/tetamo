import { Suspense } from "react";
import AuthCallbackPageClient from "./AuthCallbackPageClient";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] text-[#1C1C1E]">
          Signing you in...
        </div>
      }
    >
      <AuthCallbackPageClient />
    </Suspense>
  );
}