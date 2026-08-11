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

  const strategist = params.brain.salesStrategist;

  if (
    strategist === "agent" ||
    params.brain.customerType === "agent" ||
    params.brain.customerType === "agency"
  ) {
    const guidance = await generateAgentSalesGuidance({
      customerMessage: params.customerMessage,
      conversationContext: params.conversationContext,
      salesStage: params.salesStage,
    });

    return {
      strategist: "agent",
      guidance,
    };
  }

  if (
    strategist === "owner" ||
    params.brain.customerType === "owner"
  ) {
    const guidance = await generateOwnerSalesGuidance({
      customerMessage: params.customerMessage,
      conversationContext: params.conversationContext,
      salesStage: params.salesStage,
    });

    return {
      strategist: "owner",
      guidance,
    };
  }

  return {
    strategist: "none",
    guidance: null,
  };
}
