import type { SupabaseClient } from "@supabase/supabase-js";

import { analyseMonaV2Message } from "./analyser";
import { generateMonaV2NaturalReply } from "./natural-reply";
import {
  generateMonaV2PropertyEducationReply,
  type MonaV2PropertyEducationResult,
} from "./property-education-reply";
import { routeMonaV2Analysis } from "./router";
import {
  generateMonaV2TetamoKnowledgeReply,
  type MonaV2TetamoKnowledgeResult,
} from "./tetamo-knowledge-reply";
import type {
  MonaV2Analysis,
  MonaV2ConversationContext,
  MonaV2Decision,
} from "./types";

export type RunMonaV2Input = {
  customerMessage: string;
  messageType?: string | null;
  conversationContext?: MonaV2ConversationContext | null;
  supabase: SupabaseClient;
};

export type RunMonaV2Result = {
  message: string;
  analysis: MonaV2Analysis;
  decision: MonaV2Decision;
  tetamoKnowledge: MonaV2TetamoKnowledgeResult | null;
  propertyEducation: MonaV2PropertyEducationResult | null;
  reply: string | null;
};

export async function runMonaV2(
  input: RunMonaV2Input
): Promise<RunMonaV2Result> {
  const message = String(
    input.customerMessage ?? ""
  ).trim();

  if (!message) {
    throw new Error(
      "A customer message is required to run Mona V2."
    );
  }

  const conversationContext =
    input.conversationContext ?? null;

  const analysis = await analyseMonaV2Message({
    customerMessage: message,
    messageType: String(
      input.messageType ?? "text"
    ),
    conversationContext,
  });

  const decision = routeMonaV2Analysis(analysis);

  const naturalReply =
    decision.shouldGenerateNaturalReply
      ? await generateMonaV2NaturalReply({
          customerMessage: message,
          analysis,
          conversationContext,
        })
      : null;

  const tetamoKnowledge =
    decision.shouldSearchTetamoKnowledge
      ? await generateMonaV2TetamoKnowledgeReply({
          customerMessage: message,
          analysis,
          conversationContext,
          supabase: input.supabase,
        })
      : null;

  const propertyEducation =
    decision.shouldSearchPropertyKnowledge
      ? await generateMonaV2PropertyEducationReply({
          customerMessage: message,
          analysis,
          conversationContext,
          supabase: input.supabase,
        })
      : null;

  const reply =
    tetamoKnowledge?.reply ??
    propertyEducation?.reply ??
    naturalReply;

  return {
    message,
    analysis,
    decision,
    tetamoKnowledge,
    propertyEducation,
    reply,
  };
}
