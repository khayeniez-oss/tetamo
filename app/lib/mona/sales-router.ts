import type { MonaBrainDecision } from "./brain";
import {
  generateAgentSalesGuidance,
  type AgentSalesGuidance,
} from "./sales-agent";
import {
  generateOwnerSalesGuidance,
  type OwnerSalesGuidance,
} from "./sales-owner";

export type MonaSalesGuidance =
  | {
      strategist: "agent";
      guidance: AgentSalesGuidance;
    }
  | {
      strategist: "owner";
      guidance: OwnerSalesGuidance;
    }
  | {
      strategist: "none";
      guidance: null;
    };

type RouteMonaSalesParams = {
  brain: MonaBrainDecision;
  customerMessage: string;
  conversationContext: string | null;
  salesStage?: string | null;
};

export async function routeMonaSalesStrategy(
  params: RouteMonaSalesParams
): Promise<MonaSalesGuidance> {
  if (!params.brain.salesStrategyNeeded) {
    return {
      strategist: "none",
      guidance: null,
    };
  }

  const customerType = params.brain.customerType;

  if (
    customerType === "agent" ||
    customerType === "agency"
  ) {
    const guidance =
      await generateAgentSalesGuidance({
        customerMessage:
          params.customerMessage,
        conversationContext:
          params.conversationContext,
        salesStage:
          params.salesStage,
        brainRecommendedNextStep:
          params.brain.recommendedNextStep,
      });

    return {
      strategist: "agent",
      guidance,
    };
  }

  if (customerType === "owner") {
    const guidance =
      await generateOwnerSalesGuidance({
        customerMessage:
          params.customerMessage,
        conversationContext:
          params.conversationContext,
        salesStage:
          params.salesStage,
      });

    return {
      strategist: "owner",
      guidance,
    };
  }

  // Developer, buyer/renter and unknown customers do not enter
  // the Agent or Owner commercial strategist.
  //
  // customerType is authoritative for routing.
  // salesStrategist must never override an established or unresolved role.
  return {
    strategist: "none",
    guidance: null,
  };
}
