import { phase1Stage, phase1Result } from "./phase1-trace.mjs";
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
  const __phase1Span = phase1Stage("sales.route");
  __phase1Span.phase("routing");
  try {

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
    return phase1Result(__phase1Span, noSalesGuidance(), 1);
  }

  /*
   * Brain decides whether commercial Sales reasoning
   * is needed for this customer turn.
   */
  if (!brain.salesStrategyNeeded) {
    return phase1Result(__phase1Span, noSalesGuidance(), 2);
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
    __phase1Span.phase("specialist.wait");
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

    return phase1Result(__phase1Span, {
      strategist: "agent",
      guidance,
    }, 3);
  }

  /*
   * OWNER
   *
   * Owner Sales receives the same complete Brain context.
   */
  if (customerType === "owner") {
    __phase1Span.phase("specialist.wait");
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

    return phase1Result(__phase1Span, {
      strategist: "owner",
      guidance,
    }, 4);
  }

  /*
   * Buyer/Renter, Developer and Unknown do not enter
   * Agent or Owner Sales AI.
   */
  return phase1Result(__phase1Span, noSalesGuidance(), 5);

  } catch (__phase1Error) {
    __phase1Span.error(__phase1Error);
    throw __phase1Error;
  } finally {
    __phase1Span.end();
  }
}