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

function noSalesGuidance(): MonaSalesGuidance {
  return {
    strategist: "none",
    guidance: null,
  };
}

export async function routeMonaSalesStrategy(
  params: RouteMonaSalesParams
): Promise<MonaSalesGuidance> {
  const { brain } = params;

  /*
   * Sales must not run while Brain still does not understand
   * the message or while clarification / handover is required.
   */
  if (
    !brain.understood ||
    brain.handoverRecommended ||
    brain.clarification.needed
  ) {
    return noSalesGuidance();
  }

  /*
   * Brain decides whether commercial Sales reasoning
   * is needed for this customer turn.
   */
  if (!brain.salesStrategyNeeded) {
    return noSalesGuidance();
  }

  const customerType = brain.customerType;

  /*
   * AGENT / AGENCY
   *
   * Agent Sales receives the complete Brain result:
   * raw message + normalized message + resolved meaning +
   * conversation context.
   */
  if (
    customerType === "agent" ||
    customerType === "agency"
  ) {
    const guidance =
      await generateAgentSalesGuidance({
        brain,
        customerMessage:
          params.customerMessage,
        conversationContext:
          params.conversationContext,
        salesStage:
          params.salesStage,
      });

    return {
      strategist: "agent",
      guidance,
    };
  }

  /*
   * OWNER
   *
   * Owner Sales receives the same complete Brain context.
   */
  if (customerType === "owner") {
    const guidance =
      await generateOwnerSalesGuidance({
        brain,
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

  /*
   * Buyer/Renter, Developer and Unknown do not enter
   * Agent or Owner Sales AI.
   */
  return noSalesGuidance();
}