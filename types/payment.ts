export type TetamoPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded";

export type TetamoPaymentFlow =
  | "new-listing"
  | "renew-listing"
  | "boost-listing"
  | "homepage-spotlight"
  | "agent-membership";

export type TetamoGateway = "stripe" | "xendit";

export type TetamoPaymentMethod =
  | "card"
  | "bank_transfer"
  | "virtual_account"
  | "qris"
  | "ewallet";

export type TetamoUserType = "owner" | "agent";

export type TetamoProductType = "listing" | "membership" | "addon";

export type TetamoPayment = {
  id: string;

  // who is paying
  userId: string;
  userType: TetamoUserType;

  // what they are paying for
  flow: TetamoPaymentFlow;
  productId: string;
  productType: TetamoProductType;

  // optional listing connection
  listingCode?: string;

  // money
  amount: number;
  currency: "IDR";

  // renewal behavior
  autoRenew: boolean;

  // Tetamo internal status
  status: TetamoPaymentStatus;

  // what user chooses vs what system uses
  paymentMethod: TetamoPaymentMethod;
  gateway: TetamoGateway;

  // gateway references
  gatewayReferenceId?: string;
  gatewayCheckoutUrl?: string;

  // timestamps
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  expiresAt?: string;

  // optional metadata for future use
  metadata?: Record<string, string | number | boolean | null>;
};