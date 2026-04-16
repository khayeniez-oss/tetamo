import { Suspense } from "react";
import PaymentPageClient from "./PaymentPageClient";

export default function VehiclesCreatePaymentPage() {
  return (
    <Suspense fallback={null}>
      <PaymentPageClient />
    </Suspense>
  );
}