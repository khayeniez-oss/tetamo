import type {
  TetamoGateway,
  TetamoPayment,
  TetamoPaymentMethod,
  TetamoPaymentStatus,
} from "@/types/payment";

/**
 * Decide which gateway should be used
 * based on payment method
 */
export function getGatewayFromPaymentMethod(
  paymentMethod: TetamoPaymentMethod
): TetamoGateway {
  if (paymentMethod === "card") {
    return "stripe";
  }

  return "xendit";
}

/**
 * Backward-compatible helper.
 * Real payment creation now happens in /api/payments/create.
 */
export function createPaymentRecord(payment: TetamoPayment) {
  console.log("createPaymentRecord is now API-driven:", payment);
  return payment;
}

/**
 * Backward-compatible helper.
 * Real payment status update should be done via API/webhook later.
 */
export function updatePaymentStatus(
  paymentId: string,
  status: TetamoPaymentStatus
) {
  console.log("updatePaymentStatus placeholder:", {
    paymentId,
    status,
  });
}

/**
 * Backward-compatible helper.
 * Real payment fetch should come from Supabase later.
 */
export function getPaymentById(paymentId: string) {
  console.log("getPaymentById placeholder:", paymentId);
  return null;
}

/**
 * Backward-compatible helper.
 */
export function markPaymentAsPaid(paymentId: string) {
  updatePaymentStatus(paymentId, "paid");
}

/**
 * Backward-compatible helper.
 */
export function markPaymentAsFailed(paymentId: string) {
  updatePaymentStatus(paymentId, "failed");
}