import { Suspense } from "react";
import SignupPageContent from "./client";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-6 py-16" />}>
      <SignupPageContent />
    </Suspense>
  );
}